import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isoToTs } from "../../src/date";
import { boardItemsForContext, selectRows } from "../../src/model";
import type { AvailabilityConfig } from "../../src/vacation";
import { availabilityReasonsForTs } from "../../src/vacation";
import { files } from "../testSupport";

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

function tree(entries: Array<{ path: string; markdown: string }>) {
  return files([
    {
      path: "Root.md",
      markdown:
        "---\nstatus: closed\nup: -\n---\n\n- [x] reviewed ✅ 2026-07-08",
    },
    ...entries,
  ]);
}

describe("Vacation availability feature", () => {
  beforeEach(() => {
    (window as Window & { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY =
      "2026-07-17";
  });

  afterEach(() => {
    delete (window as Window & { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY;
  });

  it("recognizes configured and overlapping unavailable days", () => {
    expect(availabilityReasonsForTs(isoToTs("2026-07-18"), config)).toEqual([
      { kind: "personal", label: "Summer break" },
      { kind: "holiday", label: "Founders Day" },
      { kind: "weekend", label: "Weekend" },
    ]);
  });

  it("shows only markers for the OOO context filter", () => {
    const rows = selectRows(
      tree([
        {
          path: "Mission/Trip.md",
          markdown: `---
status: open
up: [[Root]]
---

- [ ] after vacation 📅 2026-07-20
`,
        },
      ]),
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
      tree([
        {
          path: "Mission/Trip.md",
          markdown: `---
status: open
up: [[Root]]
---

- [ ] after vacation 📅 2026-07-20
`,
        },
      ]),
      "open",
      "*",
      config,
    );

    const items = boardItemsForContext(rows, rows, "*", config);
    expect(items.some((item) => item.kind === "marker")).toBe(true);
    expect(items.some((item) => item.kind === "task")).toBe(true);
  });

  it("suppresses markers for a normal context filter", () => {
    const indexedFiles = tree([
      {
        path: "Hardware.md",
        markdown: "---\nstatus: closed\nup: [[Root]]\n---\n",
      },
      {
        path: "Hardware/Car.md",
        markdown:
          "---\nstatus: open\nup: [[Hardware]]\n---\n\n- [ ] service car 📅 2026-07-20",
      },
      {
        path: "Growth.md",
        markdown: "---\nstatus: closed\nup: [[Root]]\n---\n",
      },
      {
        path: "Growth/Study.md",
        markdown:
          "---\nstatus: open\nup: [[Growth]]\n---\n\n- [ ] study 📅 2026-07-20",
      },
    ]);
    const filteredRows = selectRows(indexedFiles, "open", "Hardware", config);
    const allRows = selectRows(indexedFiles, "open", "*", config);
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
