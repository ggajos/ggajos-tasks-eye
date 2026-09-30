import type { JsonRequest } from "./holidaySync";
import {
  requiredHolidayYears,
  syncNagerCountries,
  syncNagerHolidayYears,
} from "./holidaySync";
import type { EyeFile } from "./types";
import type { AvailabilitySettings, HolidayCache } from "./vacation";

export const HOLIDAY_RETRY_MS = 60 * 60 * 1000;

/** The persisted state the syncer reads and updates. */
export interface HolidaySyncState {
  availability: AvailabilitySettings;
  holidayCache: HolidayCache;
}

export interface HolidaySyncHost {
  state(): HolidaySyncState;
  /** Persist `state()` after the syncer changed it. */
  save(): Promise<void>;
  /** Holiday data that affects availability changed. */
  dataChanged(): Promise<void>;
  /** Sync progress or error state changed. */
  statusChanged(): void;
}

export interface HolidaySyncTimers {
  set(callback: () => void, ms: number): number;
  clear(id: number): void;
}

export interface HolidaySyncDeps {
  request?: JsonRequest;
  now?: () => number;
  timers?: HolidaySyncTimers;
  formatDate?: (ts: number) => string;
}

const windowTimers: HolidaySyncTimers = {
  set: (callback, ms) => window.setTimeout(callback, ms),
  clear: (id) => window.clearTimeout(id),
};

function defaultFormatDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(ts);
}

export function normalizeCountryCode(countryCode: string): string {
  const upper = countryCode.toUpperCase();
  return /^[A-Z]{2}$/.test(upper) ? upper : "";
}

/**
 * Keeps the public-holiday cache current: serializes Nager requests, retries
 * after failures, ignores results for a country the user has since left, and
 * reports a human-readable status.
 */
export class HolidaySyncer {
  private chain: Promise<void> = Promise.resolve();
  private running = 0;
  private error: string | null = null;
  private retryTimer: number | null = null;
  private readonly timers: HolidaySyncTimers;
  private readonly formatDate: (ts: number) => string;

  constructor(
    private readonly host: HolidaySyncHost,
    private readonly deps: HolidaySyncDeps = {},
  ) {
    this.timers = deps.timers ?? windowTimers;
    this.formatDate = deps.formatDate ?? defaultFormatDate;
  }

  get syncing(): boolean {
    return this.running > 0;
  }

  status(): string {
    const { availability, holidayCache } = this.host.state();
    if (!availability.countryCode) {
      if (this.syncing) return "Loading available countries…";
      return this.error
        ? "Countries are temporarily unavailable; retrying automatically."
        : "Choose a country to enable public holidays.";
    }
    const cachedYears =
      holidayCache.countryCode === availability.countryCode
        ? Object.entries(holidayCache.years).sort(([a], [b]) =>
            a.localeCompare(b),
          )
        : [];
    const latest = cachedYears
      .map(([, cached]) => Date.parse(cached.fetchedAt))
      .filter(Number.isFinite)
      .sort((a, b) => b - a)[0];
    const cacheStatus =
      cachedYears.length === 0
        ? "No cached public holidays yet."
        : `Updated ${latest ? this.formatDate(latest) : "previously"} · ` +
          `cached years ${cachedYears.map(([year]) => year).join(", ")}.`;
    const status = this.syncing
      ? `Updating automatically… ${cacheStatus}`
      : cacheStatus;
    return this.error
      ? `${status} Could not update; using cached data.`
      : status;
  }

  /** Start background syncing for an already-configured country. */
  start(): void {
    if (!this.host.state().availability.countryCode) return;
    void this.refreshCountries();
    void this.refreshYears();
  }

  stop(): void {
    this.clearRetry();
  }

  async refreshCountries(force = false): Promise<void> {
    await this.enqueue(async () => {
      const state = this.host.state();
      const result = await syncNagerCountries(state.holidayCache, {
        force,
        now: this.now(),
        request: this.deps.request,
      });
      if (result.changed) {
        state.holidayCache = {
          ...state.holidayCache,
          countries: result.cache.countries,
          countriesFetchedAt: result.cache.countriesFetchedAt,
        };
        await this.host.save();
      }
      this.recordErrors(result.errors, !state.availability.countryCode);
    });
  }

  /** Ensure the years needed by `files` are cached for the current country. */
  async refreshYears(
    force = false,
    files: readonly EyeFile[] = [],
    prune = false,
  ): Promise<void> {
    const countryCode = this.host.state().availability.countryCode;
    if (!countryCode || (!force && this.retryTimer !== null)) return;
    const years = requiredHolidayYears(files);
    await this.enqueue(async () => {
      const state = this.host.state();
      if (state.availability.countryCode !== countryCode) return;
      const result = await syncNagerHolidayYears(
        state.holidayCache,
        countryCode,
        years,
        { force, prune, now: this.now(), request: this.deps.request },
      );
      if (this.host.state().availability.countryCode !== countryCode) return;
      if (result.changed) {
        this.host.state().holidayCache = result.cache;
        await this.host.save();
        await this.host.dataChanged();
      }
      this.recordErrors(result.errors);
    });
  }

  async setCountry(countryCode: string): Promise<void> {
    const normalized = normalizeCountryCode(countryCode);
    const state = this.host.state();
    if (state.availability.countryCode === normalized) return;
    state.availability.countryCode = normalized;
    if (state.holidayCache.countryCode !== normalized) {
      state.holidayCache = {
        ...state.holidayCache,
        countryCode: normalized,
        years: {},
      };
    }
    this.error = null;
    await this.host.save();
    await this.host.dataChanged();
    this.host.statusChanged();
    if (normalized) await this.refreshYears(true);
  }

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  private async enqueue(work: () => Promise<void>): Promise<void> {
    this.running++;
    this.host.statusChanged();
    const run = this.chain.then(work, work);
    this.chain = run.catch(() => undefined);
    try {
      await run;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      console.error("Tasks Eye could not refresh public holidays.", error);
    } finally {
      this.running--;
      this.host.statusChanged();
    }
  }

  private recordErrors(errors: readonly string[], clearOnSuccess = true): void {
    if (errors.length > 0) {
      this.error = errors.join("; ");
      if (this.retryTimer === null) {
        this.retryTimer = this.timers.set(() => {
          this.retryTimer = null;
          void this.retry();
        }, HOLIDAY_RETRY_MS);
      }
      return;
    }
    if (!clearOnSuccess) return;
    this.error = null;
    this.clearRetry();
  }

  private clearRetry(): void {
    if (this.retryTimer === null) return;
    this.timers.clear(this.retryTimer);
    this.retryTimer = null;
  }

  private async retry(): Promise<void> {
    await this.refreshCountries();
    if (this.host.state().availability.countryCode) {
      await this.refreshYears();
    }
  }
}
