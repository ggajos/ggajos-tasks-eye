import { describe, expect, it } from "vitest";
import { isoToTs } from "../../src/date";
import { boardItemsForContext, selectRows } from "../../src/model";
import type { VacationConfig } from "../../src/vacation";
import { vacationReasonForTs } from "../../src/vacation";
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
    const rows = selectRows(
      [
        file(
          "Mission/Trip.md",
          `---
status: open
---

- [ ] after vacation 📅 2026-07-20
`,
        ),
      ],
      "open",
      "*",
    );

    expect(
      boardItemsForContext(rows, rows, "ooo").every(
        (item) => item.kind === "marker",
      ),
    ).toBe(true);
  });

  it("interleaves markers with the unfiltered work timeline", () => {
    const rows = selectRows(
      [
        file(
          "Mission/Trip.md",
          `---
status: open
---

- [ ] after vacation 📅 2026-07-20
`,
        ),
      ],
      "open",
      "*",
    );

    const items = boardItemsForContext(rows, rows, "*");
    expect(items.some((item) => item.kind === "marker")).toBe(true);
    expect(items.some((item) => item.kind === "task")).toBe(true);
  });

  it("suppresses markers for a normal context filter", () => {
    const files = [
      file(
        "Hardware/Car.md",
        "---\nstatus: open\n---\n\n- [ ] service car 📅 2026-07-20",
      ),
      file(
        "Growth/Study.md",
        "---\nstatus: open\n---\n\n- [ ] study 📅 2026-07-20",
      ),
    ];
    const filteredRows = selectRows(files, "open", "Hardware");
    const allRows = selectRows(files, "open", "*");
    const items = boardItemsForContext(filteredRows, allRows, "Hardware");

    expect(items.every((item) => item.kind === "task")).toBe(true);
    expect(
      items.map((item) =>
        item.kind === "task" ? item.model.file.basename : item.marker.label,
      ),
    ).toEqual(["Car"]);
  });
});
