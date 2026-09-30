import { describe, expect, it, vi } from "vitest";
import type { HolidaySyncState } from "../src/holidaySyncer";
import { HOLIDAY_RETRY_MS, HolidaySyncer } from "../src/holidaySyncer";

const NOW = Date.parse("2026-07-08T10:00:00Z");

function state(countryCode = ""): HolidaySyncState {
  return {
    availability: {
      countryCode,
      nonWorkingWeekdays: [0, 6],
      personalTimeOff: [],
    },
    holidayCache: {
      countryCode,
      years: {},
      countries: [],
      countriesFetchedAt: null,
    },
  };
}

function holiday(date: string) {
  return {
    date,
    name: "Holiday",
    nationalHoliday: true,
    holidayTypes: ["Public"],
  };
}

function harness(
  initial: HolidaySyncState,
  request: (url: string) => Promise<unknown>,
) {
  const current = initial;
  const pending: Array<{ callback: () => void; ms: number; id: number }> = [];
  let nextId = 1;
  const host = {
    state: () => current,
    save: vi.fn(async () => undefined),
    dataChanged: vi.fn(async () => undefined),
    statusChanged: vi.fn(),
  };
  const syncer = new HolidaySyncer(host, {
    request,
    now: () => NOW,
    formatDate: () => "Jul 8, 2026",
    timers: {
      set: (callback, ms) => {
        const id = nextId++;
        pending.push({ callback, ms, id });
        return id;
      },
      clear: (id) => {
        const index = pending.findIndex((timer) => timer.id === id);
        if (index >= 0) pending.splice(index, 1);
      },
    },
  });
  return { syncer, host, state: current, pending };
}

describe("Holiday syncer", () => {
  it("caches holiday years for the chosen country and refreshes views", async () => {
    const {
      syncer,
      host,
      state: s,
    } = harness(state(), async (url) =>
      url.includes("/Holidays/PL/") ? [holiday(`${url.slice(-4)}-05-01`)] : [],
    );

    await syncer.setCountry("pl");

    expect(s.availability.countryCode).toBe("PL");
    expect(Object.keys(s.holidayCache.years)).not.toHaveLength(0);
    expect(host.dataChanged).toHaveBeenCalled();
    expect(syncer.status()).toMatch(/^Updated Jul 8, 2026 · cached years /);
  });

  it("schedules one retry after a failure and clears it on success", async () => {
    let fail = true;
    const { syncer, pending } = harness(state("PL"), async (url) => {
      if (fail) throw new Error("offline");
      return url.includes("/Countries/")
        ? [{ countryCode: "PL", name: "Poland" }]
        : [holiday("2026-05-01")];
    });

    await syncer.refreshYears(true);
    await syncer.refreshYears(true);
    expect(pending).toHaveLength(1);
    expect(pending[0]!.ms).toBe(HOLIDAY_RETRY_MS);
    expect(syncer.status()).toContain("Could not update; using cached data.");

    fail = false;
    pending.shift()!.callback();
    await vi.waitFor(() => expect(syncer.syncing).toBe(false));
    await syncer.refreshYears(true);
    expect(pending).toHaveLength(0);
    expect(syncer.status()).not.toContain("Could not update");
  });

  it("skips background refreshes while a retry is pending", async () => {
    const request = vi.fn(async () => {
      throw new Error("offline");
    });
    const { syncer } = harness(state("PL"), request);

    await syncer.refreshYears(true);
    const calls = request.mock.calls.length;
    await syncer.refreshYears();
    expect(request.mock.calls.length).toBe(calls);
  });

  it("drops results for a country the user has since left", async () => {
    const releases: Array<(value: unknown) => void> = [];
    const { syncer, state: s } = harness(state("PL"), (url) =>
      url.includes("/PL/")
        ? new Promise((resolve) => {
            releases.push(resolve);
          })
        : Promise.resolve([holiday("2026-10-03")]),
    );

    const stale = syncer.refreshYears(true);
    await vi.waitFor(() => expect(releases).toHaveLength(2));
    const switched = syncer.setCountry("DE");
    for (const release of releases) release([holiday("2026-05-01")]);
    await Promise.all([stale, switched]);

    expect(s.holidayCache.countryCode).toBe("DE");
    const dates = Object.values(s.holidayCache.years).flatMap((year) =>
      year.holidays.map((h) => h.date),
    );
    expect(dates).not.toContain("2026-05-01");
  });

  it("explains the state before a country is chosen", () => {
    const { syncer } = harness(state(), async () => []);
    expect(syncer.status()).toBe("Choose a country to enable public holidays.");
  });
});
