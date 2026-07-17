import { describe, expect, it } from "vitest";
import { isoToTs } from "../../src/date";
import { boardItemsForContext, selectRows } from "../../src/model";
import type { AvailabilityConfig } from "../../src/vacation";
import { availabilityReasonsForTs } from "../../src/vacation";
import { file } from "../testSupport";

const config: AvailabilityConfig = {
  nonWorkingWeekdays: [0, 6],
  publicHolidays: [{ date: "2026-07-18", name: "Founders Day" }],
  personalTimeOff: [
    {
      id: "summer-break",
      from: "2026-07-18",
      to: "2026-07-19",
      label: "Summer break",
    },
  ],
};

describe("Vacation availability feature", () => {
  it("recognizes configured and overlapping unavailable days", () => {
    expect(availabilityReasonsForTs(isoToTs("2026-07-18"), config)).toEqual([
      { kind: "personal", label: "Summer break" },
      { kind: "holiday", label: "Founders Day" },
      { kind: "weekend", label: "Weekend" },
    ]);
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
      config,
    );

    expect(
      boardItemsForContext(rows, rows, "ooo", config).every(
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
      config,
    );

    const items = boardItemsForContext(rows, rows, "*", config);
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
    const filteredRows = selectRows(files, "open", "Hardware", config);
    const allRows = selectRows(files, "open", "*", config);
    const items = boardItemsForContext(
      filteredRows,
      allRows,
      "Hardware",
      config,
    );

    expect(items.every((item) => item.kind === "task")).toBe(true);
    expect(
      items.map((item) =>
        item.kind === "task" ? item.model.file.basename : item.marker.label,
      ),
    ).toEqual(["Car"]);
  });
});
