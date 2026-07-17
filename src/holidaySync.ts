import { requestUrl } from "obsidian";
import { isIsoDate, nowDate, todayIso } from "./date";
import type { EyeFile } from "./types";
import type {
  AvailabilitySettings,
  CachedHolidayYear,
  HolidayCache,
  HolidayCountry,
  PersonalTimeOff,
  PublicHoliday,
} from "./vacation";

const NAGER_API_ROOT = "https://date.nager.at/api/v4";
const COUNTRY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const HOLIDAY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type JsonRequest = (url: string) => Promise<unknown>;

export interface SyncResult {
  cache: HolidayCache;
  changed: boolean;
  errors: string[];
}

async function requestJson(url: string): Promise<unknown> {
  return (await requestUrl({ url })).json;
}

function fresh(iso: string | null, ttlMs: number, now: number): boolean {
  if (!iso) return false;
  const fetchedAt = Date.parse(iso);
  return Number.isFinite(fetchedAt) && now - fetchedAt < ttlMs;
}

function countryFrom(value: unknown): HolidayCountry | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.countryCode !== "string" ||
    !/^[A-Z]{2}$/.test(candidate.countryCode) ||
    typeof candidate.name !== "string" ||
    !candidate.name.trim()
  ) {
    return null;
  }
  return {
    countryCode: candidate.countryCode,
    name: candidate.name.trim(),
  };
}

function publicHolidayFrom(value: unknown): PublicHoliday | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (
    !isIsoDate(candidate.date) ||
    typeof candidate.name !== "string" ||
    candidate.nationalHoliday !== true ||
    !Array.isArray(candidate.holidayTypes) ||
    !candidate.holidayTypes.includes("Public")
  ) {
    return null;
  }
  return {
    date: candidate.date,
    name: candidate.name.trim() || "Holiday",
  };
}

export async function fetchNagerCountries(
  request: JsonRequest = requestJson,
): Promise<HolidayCountry[]> {
  const value = await request(`${NAGER_API_ROOT}/Countries/Available`);
  if (!Array.isArray(value)) throw new Error("Nager returned no country list.");
  return value
    .map(countryFrom)
    .filter((country): country is HolidayCountry => country !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchNagerHolidays(
  countryCode: string,
  year: number,
  request: JsonRequest = requestJson,
): Promise<PublicHoliday[]> {
  const value = await request(
    `${NAGER_API_ROOT}/Holidays/${countryCode}/${year}`,
  );
  if (!Array.isArray(value)) {
    throw new Error(`Nager returned no holiday list for ${year}.`);
  }
  const seen = new Set<string>();
  return value
    .map(publicHolidayFrom)
    .filter((holiday): holiday is PublicHoliday => holiday !== null)
    .filter((holiday) => {
      const key = `${holiday.date}\u0000${holiday.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name),
    );
}

function cloneCache(cache: HolidayCache): HolidayCache {
  return {
    countryCode: cache.countryCode,
    years: { ...cache.years },
    countries: [...cache.countries],
    countriesFetchedAt: cache.countriesFetchedAt,
  };
}

export async function syncNagerCountries(
  cache: HolidayCache,
  options: { force?: boolean; now?: number; request?: JsonRequest } = {},
): Promise<SyncResult> {
  const now = options.now ?? Date.now();
  if (
    !options.force &&
    cache.countries.length > 0 &&
    fresh(cache.countriesFetchedAt, COUNTRY_TTL_MS, now)
  ) {
    return { cache, changed: false, errors: [] };
  }

  try {
    const countries = await fetchNagerCountries(options.request);
    if (countries.length === 0) throw new Error("Nager returned no countries.");
    return {
      cache: {
        ...cloneCache(cache),
        countries,
        countriesFetchedAt: new Date(now).toISOString(),
      },
      changed: true,
      errors: [],
    };
  } catch (error) {
    return {
      cache,
      changed: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

export async function syncNagerHolidayYears(
  cache: HolidayCache,
  countryCode: string,
  years: readonly number[],
  options: { force?: boolean; now?: number; request?: JsonRequest } = {},
): Promise<SyncResult> {
  if (!countryCode) return { cache, changed: false, errors: [] };
  const now = options.now ?? Date.now();
  let next = cloneCache(cache);
  let changed = false;
  if (next.countryCode !== countryCode) {
    next = { ...next, countryCode, years: {} };
    changed = true;
  }

  const requested = [...new Set(years)]
    .filter((year) => Number.isInteger(year) && year >= 1 && year <= 9999)
    .sort((a, b) => a - b);
  const needed = requested.filter((year) => {
    const cached = next.years[String(year)];
    return (
      options.force || !cached || !fresh(cached.fetchedAt, HOLIDAY_TTL_MS, now)
    );
  });
  const errors: string[] = [];

  const results = await Promise.allSettled(
    needed.map(async (year) => ({
      year,
      holidays: await fetchNagerHolidays(countryCode, year, options.request),
    })),
  );
  for (let index = 0; index < results.length; index++) {
    const result = results[index]!;
    const year = needed[index]!;
    if (result.status === "rejected") {
      const message =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      errors.push(`${year}: ${message}`);
      continue;
    }
    const cachedYear: CachedHolidayYear = {
      fetchedAt: new Date(now).toISOString(),
      holidays: result.value.holidays,
    };
    next.years[String(result.value.year)] = cachedYear;
    changed = true;
  }

  return { cache: changed ? next : cache, changed, errors };
}

export function requiredHolidayYears(files: readonly EyeFile[]): number[] {
  const current = nowDate().getFullYear();
  const years = new Set([current, current + 1]);
  for (const file of files) {
    for (const task of file.tasks) {
      if (task.completed || !task.dueIso) continue;
      years.add(Number(task.dueIso.slice(0, 4)));
    }
  }
  return [...years].filter(Number.isInteger).sort((a, b) => a - b);
}

function personalId(index: number, from: string): string {
  return `time-off-${index + 1}-${from}`;
}

function personalTimeOffFrom(
  value: unknown,
  index: number,
): PersonalTimeOff | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (!isIsoDate(candidate.from)) return null;
  let to = isIsoDate(candidate.to) ? candidate.to : null;
  let from = candidate.from;
  if (to && to < from) [from, to] = [to, from];
  return {
    id:
      typeof candidate.id === "string" && candidate.id.trim()
        ? candidate.id
        : personalId(index, from),
    from,
    to,
    label: typeof candidate.label === "string" ? candidate.label.trim() : "",
  };
}

export function normalizeAvailabilitySettings(
  value: unknown,
): AvailabilitySettings {
  const candidate =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const countryCode =
    typeof candidate.countryCode === "string" &&
    /^[A-Z]{2}$/.test(candidate.countryCode.toUpperCase())
      ? candidate.countryCode.toUpperCase()
      : "";
  const weekdays = Array.isArray(candidate.nonWorkingWeekdays)
    ? [...new Set(candidate.nonWorkingWeekdays)]
        .filter(
          (day): day is number =>
            typeof day === "number" &&
            Number.isInteger(day) &&
            day >= 0 &&
            day <= 6,
        )
        .sort((a, b) => a - b)
    : [0, 6];
  const personalTimeOff = Array.isArray(candidate.personalTimeOff)
    ? candidate.personalTimeOff
        .map(personalTimeOffFrom)
        .filter((entry): entry is PersonalTimeOff => entry !== null)
        .sort(
          (a, b) => a.from.localeCompare(b.from) || a.id.localeCompare(b.id),
        )
    : [];
  return { countryCode, nonWorkingWeekdays: weekdays, personalTimeOff };
}

function cachedHolidayYearFrom(value: unknown): CachedHolidayYear | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.fetchedAt !== "string" ||
    !Array.isArray(candidate.holidays)
  ) {
    return null;
  }
  const holidays = candidate.holidays
    .map((holiday) => {
      if (typeof holiday !== "object" || holiday === null) return null;
      const record = holiday as Record<string, unknown>;
      return isIsoDate(record.date) && typeof record.name === "string"
        ? { date: record.date, name: record.name.trim() || "Holiday" }
        : null;
    })
    .filter((holiday): holiday is PublicHoliday => holiday !== null);
  return { fetchedAt: candidate.fetchedAt, holidays };
}

export function normalizeHolidayCache(value: unknown): HolidayCache {
  const candidate =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const years: Record<string, CachedHolidayYear> = {};
  if (typeof candidate.years === "object" && candidate.years !== null) {
    for (const [year, cached] of Object.entries(candidate.years)) {
      if (!/^\d{4}$/.test(year)) continue;
      const normalized = cachedHolidayYearFrom(cached);
      if (normalized) years[year] = normalized;
    }
  }
  const countries = Array.isArray(candidate.countries)
    ? candidate.countries
        .map(countryFrom)
        .filter((country): country is HolidayCountry => country !== null)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  return {
    countryCode:
      typeof candidate.countryCode === "string" &&
      /^[A-Z]{2}$/.test(candidate.countryCode)
        ? candidate.countryCode
        : "",
    years,
    countries,
    countriesFetchedAt:
      typeof candidate.countriesFetchedAt === "string"
        ? candidate.countriesFetchedAt
        : null,
  };
}

export function newPersonalTimeOff(id: string): PersonalTimeOff {
  return { id, from: todayIso(), to: null, label: "" };
}
