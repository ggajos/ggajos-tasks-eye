import { describe, expect, it } from "vitest";
import { isoToTs } from "../../src/date";
import { boardItemsForContext, selectRows } from "../../src/model";
import { vacationReasonForTs } from "../../src/vacation";
import type { VacationConfig } from "../../src/vacation";
import { file } from "../testSupport";

const config: VacationConfig = {
  weekendDays: [0, 6],
  bankHolidaysAnnual: ["05-01"],
  customDates: ["2026-07-13"],
};

describe("Vacation availability feature", () => {
  it("recognizes configured unavailable days", () => {
    expect(vacationReasonForTs(isoToTs("2026-07-11"), config)).toBe("weekend");
    expect(vacationReasonForTs(isoToTs("2026-05-01"), config)).toBe("holiday");
    expect(vacationReasonForTs(isoToTs("2026-07-13"), config)).toBe("custom");
  });

  it("shows only markers for the OOO context filter", () => {
    const rows = selectRows([
      file(
        "Db/Mission/Trip.md",
        `---
status: open
---

- [ ] after vacation 📅 2026-07-20
`,
      ),
    ], "open", "*");

    expect(boardItemsForContext(rows, rows, "ooo").every((item) =>
      item.kind === "marker"
    )).toBe(true);
  });
});
