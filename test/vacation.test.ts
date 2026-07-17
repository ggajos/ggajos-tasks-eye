import { describe, expect, it } from "vitest";
import { isoToTs } from "../src/date";
import type { AvailabilityConfig } from "../src/vacation";
import { availabilityReasonsForTs, vacationMarkers } from "../src/vacation";

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
