import { describe, expect, it } from "vitest";
import {
  fetchNagerCountries,
  fetchNagerHolidays,
  normalizeAvailabilitySettings,
  requiredHolidayYears,
  syncNagerHolidayYears,
} from "../src/holidaySync";
import { buildEyeFileFromMarkdown } from "../src/indexer";
import type { HolidayCache } from "../src/vacation";

const emptyCache = (): HolidayCache => ({
  countryCode: "",
  years: {},
  countries: [],
  countriesFetchedAt: null,
});

describe("Nager holiday sync", () => {
  it("validates and sorts available countries", async () => {
    await expect(
      fetchNagerCountries(async () => [
        { countryCode: "PL", name: "Poland" },
        { countryCode: "DE", name: "Germany" },
        { countryCode: "bad", name: "Ignored" },
      ]),
    ).resolves.toEqual([
      { countryCode: "DE", name: "Germany" },
      { countryCode: "PL", name: "Poland" },
    ]);
  });

  it("keeps only nationwide public holidays and their names", async () => {
    await expect(
      fetchNagerHolidays("PL", 2026, async () => [
        {
          date: "2026-01-01",
          name: "New Year's Day",
          nationalHoliday: true,
          holidayTypes: ["Public"],
        },
        {
          date: "2026-06-01",
          name: "Regional Day",
          nationalHoliday: false,
          holidayTypes: ["Public"],
        },
        {
          date: "2026-12-31",
          name: "Bank Day",
          nationalHoliday: true,
          holidayTypes: ["Bank"],
        },
      ]),
    ).resolves.toEqual([{ date: "2026-01-01", name: "New Year's Day" }]);
  });

  it("keeps the last good year when a refresh fails", async () => {
    const cache: HolidayCache = {
      ...emptyCache(),
      countryCode: "PL",
      years: {
        "2026": {
          fetchedAt: "2026-01-01T00:00:00.000Z",
          holidays: [{ date: "2026-01-01", name: "New Year's Day" }],
        },
      },
    };
    const result = await syncNagerHolidayYears(cache, "PL", [2026], {
      force: true,
      now: Date.parse("2026-07-17T00:00:00.000Z"),
      request: async () => {
        throw new Error("offline");
      },
    });

    expect(result.cache).toBe(cache);
    expect(result.errors).toEqual(["2026: offline"]);
  });

  it("adds current, next, and unchecked task years to coverage", () => {
    (globalThis as { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY = "2026-07-17";
    const file = buildEyeFileFromMarkdown(
      "Planning/Roadmap.md",
      "- [ ] future 📅 2029-03-01\n- [x] done 📅 2035-01-01",
    );

    expect(requiredHolidayYears([file])).toEqual([2026, 2027, 2029]);
    delete (globalThis as { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY;
  });
});

describe("availability settings normalization", () => {
  it("normalizes country, weekdays, ranges, and labels", () => {
    expect(
      normalizeAvailabilitySettings({
        countryCode: "pl",
        nonWorkingWeekdays: [6, 0, 6, 9],
        personalTimeOff: [
          {
            from: "2026-07-20",
            to: "2026-07-18",
            label: "  Trip  ",
          },
        ],
      }),
    ).toEqual({
      countryCode: "PL",
      nonWorkingWeekdays: [0, 6],
      personalTimeOff: [
        {
          id: "time-off-1-2026-07-18",
          from: "2026-07-18",
          to: "2026-07-20",
          label: "Trip",
        },
      ],
    });
  });
});
