import { describe, expect, it } from "vitest";
import type { AvailabilityConfig } from "../src/availability";
import {
  availabilityReasonsForTs,
  formatNonWorkingWeekdays,
  markersForDueRange,
  parseNonWorkingWeekdays,
  vacationMarkers,
} from "../src/availability";
import { isoToTs } from "../src/date";

const config: AvailabilityConfig = {
  nonWorkingWeekdays: [0, 6],
  publicHolidays: [
    { date: "2026-07-18", name: "Founders Day" },
    { date: "2026-07-20", name: "Planning Day" },
  ],
  personalTimeOff: [
    {
      id: "trip",
      from: "2026-07-18",
      to: "2026-07-20",
      label: "Family trip",
    },
  ],
};

describe("vacation helpers", () => {
  it("preserves every reason for overlapping unavailable days", () => {
    expect(availabilityReasonsForTs(isoToTs("2026-07-18"), config)).toEqual([
      { kind: "personal", label: "Family trip" },
      { kind: "holiday", label: "Founders Day" },
      { kind: "weekend", label: "Weekend" },
    ]);
  });

  it("uses Vacation when a personal range has no label", () => {
    expect(
      availabilityReasonsForTs(isoToTs("2026-07-13"), {
        ...config,
        personalTimeOff: [
          { id: "day", from: "2026-07-13", to: null, label: "" },
        ],
      }),
    ).toEqual([{ kind: "personal", label: "Vacation" }]);
  });

  it("emits combined markers but suppresses ordinary weekends", () => {
    const markers = vacationMarkers(
      isoToTs("2026-07-18"),
      isoToTs("2026-07-21"),
      config,
    );

    expect(
      markers.map((marker) => ({
        date: marker.dateLabel,
        label: marker.label,
        reasons: marker.reasons.map((reason) => reason.kind),
      })),
    ).toEqual([
      {
        date: "07-18",
        label: "Family trip · Founders Day · Weekend",
        reasons: ["personal", "holiday", "weekend"],
      },
      {
        date: "07-19",
        label: "Family trip · Weekend",
        reasons: ["personal", "weekend"],
      },
      {
        date: "07-20",
        label: "Family trip · Planning Day",
        reasons: ["personal", "holiday"],
      },
    ]);
  });
});

describe("non-working weekday text", () => {
  it("formats the default weekend in weekday order", () => {
    expect(formatNonWorkingWeekdays([0, 6])).toBe("Sat, Sun");
  });

  it("parses comma-separated abbreviations case-insensitively", () => {
    expect(parseNonWorkingWeekdays("sun, Mon, SAT")).toEqual([0, 1, 6]);
  });

  it("allows an empty value for no non-working weekdays", () => {
    expect(parseNonWorkingWeekdays("")).toEqual([]);
  });

  it("rejects invalid weekday text", () => {
    expect(parseNonWorkingWeekdays("Saturday")).toBeNull();
    expect(parseNonWorkingWeekdays("Sat Sun")).toBeNull();
    expect(parseNonWorkingWeekdays("Sat,")).toBeNull();
  });
});

describe("markersForDueRange", () => {
  const rangeConfig: AvailabilityConfig = {
    nonWorkingWeekdays: [0, 6],
    publicHolidays: [],
    personalTimeOff: [
      {
        id: "trip",
        from: "2026-07-10",
        to: "2026-07-25",
        label: "Trip",
      },
    ],
  };

  it("returns no markers without a due horizon", () => {
    expect(
      markersForDueRange(new Date(2026, 6, 17), null, rangeConfig),
    ).toEqual([]);
  });

  it("starts the range today, even when time off began earlier", () => {
    const markers = markersForDueRange(
      new Date(2026, 6, 17, 18),
      isoToTs("2026-07-21"),
      rangeConfig,
    );

    expect(markers.map((marker) => marker.dateLabel)).toEqual([
      "07-17",
      "07-18",
      "07-19",
      "07-20",
      "07-21",
    ]);
  });
});
