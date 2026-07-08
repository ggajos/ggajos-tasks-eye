import { describe, expect, it } from "vitest";
import { isoToTs } from "../src/date";
import {
  inCustomDates,
  vacationMarkers,
  vacationReasonForTs,
} from "../src/vacation";
import type { VacationConfig } from "../src/vacation";

const config: VacationConfig = {
  weekendDays: [0, 6],
  bankHolidaysAnnual: ["05-01"],
  customDates: [
    "2026-07-13",
    { from: "2026-07-27", to: "2026-07-18" },
  ],
};

describe("vacation helpers", () => {
  it("matches custom dates and normalized ranges", () => {
    expect(inCustomDates("2026-07-13", config.customDates)).toBe(true);
    expect(inCustomDates("2026-07-20", config.customDates)).toBe(true);
    expect(inCustomDates("2026-07-28", config.customDates)).toBe(false);
  });

  it("detects weekend, annual, and movable holidays", () => {
    expect(vacationReasonForTs(isoToTs("2026-07-11"), config))
      .toBe("weekend");
    expect(vacationReasonForTs(isoToTs("2026-05-01"), config))
      .toBe("holiday");
    expect(vacationReasonForTs(isoToTs("2026-04-06"), config))
      .toBe("holiday");
    expect(vacationReasonForTs(isoToTs("2026-06-04"), config))
      .toBe("holiday");
    expect(vacationReasonForTs(isoToTs("2026-07-13"), config))
      .toBe("custom");
    expect(vacationReasonForTs(isoToTs("2026-07-14"), config))
      .toBeNull();
  });

  it("emits markers only for custom dates and holidays", () => {
    const markers = vacationMarkers(
      isoToTs("2026-07-11"),
      isoToTs("2026-07-14"),
      config,
    );

    expect(markers.map((marker) => ({
      date: marker.dateLabel,
      label: marker.label,
      reason: marker.reason,
    }))).toEqual([
      { date: "07-13", label: "Vacation", reason: "custom" },
    ]);
  });
});
