import {
  currentYear,
  formatMonthDay,
  formatWeekday,
  formatYear,
  formatYmd,
  isoToTs,
  shiftIsoDate,
} from "./date";

export interface PersonalTimeOff {
  id: string;
  from: string;
  to: string | null;
  label: string;
}

export interface PublicHoliday {
  date: string;
  name: string;
}

export interface AvailabilitySettings {
  countryCode: string;
  nonWorkingWeekdays: number[];
  personalTimeOff: PersonalTimeOff[];
}

export interface CachedHolidayYear {
  fetchedAt: string;
  holidays: PublicHoliday[];
}

export interface HolidayCountry {
  countryCode: string;
  name: string;
}

export interface HolidayCache {
  countryCode: string;
  years: Record<string, CachedHolidayYear>;
  countries: HolidayCountry[];
  countriesFetchedAt: string | null;
}

export interface AvailabilityConfig {
  nonWorkingWeekdays: readonly number[];
  publicHolidays: readonly PublicHoliday[];
  personalTimeOff: readonly PersonalTimeOff[];
}

export type AvailabilityReasonKind = "personal" | "holiday" | "weekend";

export interface AvailabilityReason {
  kind: AvailabilityReasonKind;
  label: string;
}

export interface VacationMarker {
  ts: number;
  dateLabel: string;
  yearLabel: string;
  dayLabel: string;
  reasons: AvailabilityReason[];
  label: string;
}

export const DEFAULT_AVAILABILITY_SETTINGS: Readonly<AvailabilitySettings> = {
  countryCode: "",
  nonWorkingWeekdays: [0, 6],
  personalTimeOff: [],
};

const WEEKDAY_BY_ABBREVIATION = new Map<string, number>([
  ["mon", 1],
  ["tue", 2],
  ["wed", 3],
  ["thu", 4],
  ["fri", 5],
  ["sat", 6],
  ["sun", 0],
]);

export const NON_WORKING_WEEKDAY_ABBREVIATIONS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export function formatNonWorkingWeekdays(days: readonly number[]): string {
  const selected = new Set(days);
  return NON_WORKING_WEEKDAY_ABBREVIATIONS.filter((abbreviation) => {
    const day = WEEKDAY_BY_ABBREVIATION.get(abbreviation.toLowerCase());
    return day !== undefined && selected.has(day);
  }).join(", ");
}

export function parseNonWorkingWeekdays(value: string): number[] | null {
  if (!value.trim()) return [];

  const days = new Set<number>();
  for (const token of value.split(",")) {
    const day = WEEKDAY_BY_ABBREVIATION.get(token.trim().toLowerCase());
    if (day === undefined) return null;
    days.add(day);
  }
  return [...days].sort((a, b) => a - b);
}

export const EMPTY_HOLIDAY_CACHE: Readonly<HolidayCache> = {
  countryCode: "",
  years: {},
  countries: [],
  countriesFetchedAt: null,
};

export const EMPTY_AVAILABILITY_CONFIG: Readonly<AvailabilityConfig> = {
  nonWorkingWeekdays: [0, 6],
  publicHolidays: [],
  personalTimeOff: [],
};

function personalLabel(entry: PersonalTimeOff): string {
  return entry.label.trim() || "Vacation";
}

function inPersonalTimeOff(ymd: string, entry: PersonalTimeOff): boolean {
  const to = entry.to ?? entry.from;
  const lo = entry.from <= to ? entry.from : to;
  const hi = entry.from <= to ? to : entry.from;
  return ymd >= lo && ymd <= hi;
}

function uniqueReasons(reasons: AvailabilityReason[]): AvailabilityReason[] {
  const seen = new Set<string>();
  return reasons.filter((reason) => {
    const key = `${reason.kind}\u0000${reason.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function availabilityReasonsForTs(
  ts: number,
  config: AvailabilityConfig,
): AvailabilityReason[] {
  const ymd = formatYmd(ts);
  const reasons: AvailabilityReason[] = [];

  for (const entry of config.personalTimeOff) {
    if (inPersonalTimeOff(ymd, entry)) {
      reasons.push({ kind: "personal", label: personalLabel(entry) });
    }
  }

  for (const holiday of config.publicHolidays) {
    if (holiday.date === ymd) {
      reasons.push({
        kind: "holiday",
        label: holiday.name.trim() || "Holiday",
      });
    }
  }

  if (config.nonWorkingWeekdays.includes(new Date(ts).getDay())) {
    reasons.push({ kind: "weekend", label: "Weekend" });
  }

  return uniqueReasons(reasons);
}

export function availabilityConfigFromSettings(
  settings: AvailabilitySettings,
  cache: HolidayCache,
): AvailabilityConfig {
  const publicHolidays =
    settings.countryCode && cache.countryCode === settings.countryCode
      ? Object.values(cache.years).flatMap((year) => year.holidays)
      : [];
  return {
    nonWorkingWeekdays: settings.nonWorkingWeekdays,
    publicHolidays,
    personalTimeOff: settings.personalTimeOff,
  };
}

function makeMarker(
  iso: string,
  reasons: AvailabilityReason[],
): VacationMarker {
  const year = formatYear(iso);
  return {
    ts: isoToTs(iso),
    dateLabel: formatMonthDay(iso),
    yearLabel: year === currentYear() ? "" : year,
    dayLabel: formatWeekday(iso),
    reasons,
    label: reasons.map((reason) => reason.label).join(" · "),
  };
}

export function vacationMarkers(
  fromTs: number,
  toTs: number,
  config: AvailabilityConfig,
): VacationMarker[] {
  const markers: VacationMarker[] = [];
  if (toTs < fromTs) return markers;

  const end = formatYmd(toTs);
  let iso = formatYmd(fromTs);
  while (iso <= end) {
    const reasons = availabilityReasonsForTs(isoToTs(iso), config);
    if (reasons.some((reason) => reason.kind !== "weekend")) {
      markers.push(makeMarker(iso, reasons));
    }
    iso = shiftIsoDate(iso, 1);
  }
  return markers;
}
