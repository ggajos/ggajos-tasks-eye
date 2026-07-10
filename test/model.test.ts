import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEyeFileFromMarkdown } from "../src/indexer";
import { isoToTs } from "../src/date";
import {
  discoverContexts,
  formatContextLabel,
  normalizeContextFilter,
} from "../src/context";
import {
  boardItemsForContext,
  bucketForTs,
  buildBoardBuckets,
  buildRowModel,
  mergeItems,
  rowErrors,
  selectRows,
  vacationMarkersForRows,
} from "../src/model";
import type { RenderItem } from "../src/model";
import type { EyeFile, RowModel } from "../src/types";

function fixture(name: string, path = `Db/Mission/${name}`): EyeFile {
  const markdown = readFileSync(join(__dirname, "fixtures", name), "utf8");
  return buildEyeFileFromMarkdown(path, markdown);
}

function file(
  path: string,
  markdown: string,
): EyeFile {
  return buildEyeFileFromMarkdown(path, markdown);
}

function taskItems(rows: RowModel[]): RenderItem[] {
  return rows.map((model) => ({ kind: "task", model }));
}

function itemNames(items: RenderItem[]): string[] {
  return items.map((item) =>
    item.kind === "task" ? item.model.file.basename : item.marker.label
  );
}

describe("row model", () => {
  it("uses the earliest due task as the next action", () => {
    const row = buildRowModel(fixture("active.md"));

    expect(row.actionLabel).toBe("earlier");
    expect(row.dateLabel).toBe("06-15");
  });

  it("falls back to the first uncompleted task when no due dates exist", () => {
    const row = buildRowModel(fixture("no-due.md"));

    expect(row.actionLabel).toBe("first undated task");
    expect(row.dateLabel).toBe("no due");
  });

  it("ignores completed tasks when selecting the next action", () => {
    const row = buildRowModel(file(
      "Db/Mission/Done ignored.md",
      `---
status: open
---

- [x] completed earlier 📅 2000-01-01 ✅ 2000-01-01
- [ ] open later 📅 2026-06-20
`,
    ));

    expect(row.actionLabel).toBe("open later");
    expect(row.dateLabel).toBe("06-20");
  });
});

describe("view selection", () => {
  it("discovers row badge contexts for the context filter", () => {
    const files = [
      file(
        "Db/Growth/A.md",
        `---
status: hold
---
`,
      ),
      file(
        "Db/Mission/Allegro/B.md",
        `---
status: hold
---
`,
      ),
      file(
        "Db/Mission/7N/C.md",
        `---
status: hold
---
`,
      ),
    ];

    const contexts = discoverContexts(files);

    expect(contexts).toEqual(["growth", "m/7n", "m/allegro"]);
    expect(contexts.map(formatContextLabel)).toEqual([
      "Growth",
      "M/7N",
      "M/Allegro",
    ]);
    expect(normalizeContextFilter("mission", contexts)).toBe("*");
  });

  it("open includes open notes across due dates", () => {
    const files = [
      fixture("active.md", "Db/Mission/Active.md"),
      fixture("future.md", "Db/Mission/Future.md"),
      file(
        "Db/Mission/Hold.md",
        `---
status: hold
---

- [ ] not now
`,
      ),
    ];

    expect(selectRows(files, "open", "*").map((row) => row.file.basename))
      .toEqual(["Active", "Future"]);
  });

  it("treats missing or blank status as open", () => {
    const files = [
      file(
        "Db/Growth/Missing.md",
        `# Missing

- [ ] missing status 📅 2026-07-28
`,
      ),
      file(
        "Db/Growth/Blank.md",
        `---
status:
---

- [ ] blank status 📅 2026-07-28
`,
      ),
      file(
        "Db/Growth/Hold.md",
        `---
status: hold
---

- [ ] hold
`,
      ),
    ];

    expect(selectRows(files, "open", "*").map((row) => row.file.basename))
      .toEqual(["Blank", "Missing"]);
    expect(selectRows(files, "inbox", "*").map((row) => row.file.basename))
      .toEqual([]);
  });

  it("flags open notes with no uncompleted tasks", () => {
    const files = [
      file(
        "Db/Growth/Done.md",
        `---
status: open
---

- [x] done ✅ 2026-07-08
`,
      ),
      file(
        "Db/Growth/Empty.md",
        `---
status: open
---
`,
      ),
      file(
        "Db/Growth/Default Done.md",
        `# Default Done

- [x] done ✅ 2026-07-08
`,
      ),
      file(
        "Db/Growth/Still Open.md",
        `---
status: open
---

- [ ] still open 📅 2026-07-28
`,
      ),
    ];

    const rows = selectRows(files, "inbox", "*");

    expect(rows.map((row) => row.file.basename)).toEqual([
      "Default Done",
      "Done",
      "Empty",
    ]);
    expect(rows.every((row) =>
      row.errors.includes("open note has no uncompleted tasks")
    )).toBe(true);
  });

  it("inbox shows invalid notes independently of status", () => {
    const files = [
      fixture("active.md", "Db/Mission/Valid.md"),
      file(
        "Db/Mission/Closed with open task.md",
        `---
status: closed
---

- [ ] still open
`,
      ),
    ];

    const rows = selectRows(files, "inbox", "*");

    expect(rows.map((row) => row.file.basename)).toEqual([
      "Closed with open task",
    ]);
    expect(rows[0]!.errors).toContain("closed note has unchecked tasks");
  });

});

describe("validation and vacation markers", () => {
  it("reports only the earliest vacation clash in row errors", () => {
    const note = file(
      "Db/Mission/Vacation.md",
      `---
status: open
---

- [ ] earliest custom date 📅 2026-07-13
- [ ] later custom date 📅 2026-07-18
`,
    );

    expect(rowErrors(note)).toEqual([
      "task scheduled on vacation: 2026-07-13 (custom)",
    ]);
  });

  it("interleaves vacation markers with open rows", () => {
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

    const items = mergeItems(rows, vacationMarkersForRows(rows));
    expect(items.some((item) => item.kind === "marker")).toBe(true);
    expect(items.some((item) =>
      item.kind === "task" && item.model.file.basename === "Trip"
    )).toBe(true);
  });

  it("does not show vacation markers for a normal context filter", () => {
    const files = [
      file(
        "Db/Hardware/Car.md",
        `---
status: open
---

- [ ] after vacation 📅 2026-07-20
`,
      ),
      file(
        "Db/Growth/Study.md",
        `---
status: open
---

- [ ] study 📅 2026-07-20
`,
      ),
    ];
    const rows = selectRows(files, "open", "hardware");
    const allRows = selectRows(files, "open", "*");

    const items = boardItemsForContext(rows, allRows, "hardware");

    expect(items.every((item) => item.kind === "task")).toBe(true);
    expect(itemNames(items)).toEqual(["Car"]);
  });

  it("shows only vacation markers for the OOO context filter", () => {
    const files = [
      file(
        "Db/Hardware/Car.md",
        `---
status: open
---

- [ ] after vacation 📅 2026-07-20
`,
      ),
    ];
    const rows = selectRows(files, "open", "ooo");
    const allRows = selectRows(files, "open", "*");

    const items = boardItemsForContext(rows, allRows, "ooo");

    expect(rows).toEqual([]);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.kind === "marker")).toBe(true);
  });
});

describe("board grouping", () => {
  const now = new Date(2026, 6, 7);

  it("assigns due dates to visible board buckets", () => {
    expect(bucketForTs(null, now)).toBe("noDue");
    expect(bucketForTs(isoToTs("2026-07-06"), now)).toBe("today");
    expect(bucketForTs(isoToTs("2026-07-07"), now)).toBe("today");
    expect(bucketForTs(isoToTs("2026-07-08"), now)).toBe("tomorrow");
    expect(bucketForTs(isoToTs("2026-07-20"), now)).toBe("thisMonth");
    expect(bucketForTs(isoToTs("2026-08-01"), now)).toBe("nextMonth");
    expect(bucketForTs(isoToTs("2026-09-01"), now)).toBe("future");
  });

  it("puts no-due work in a separate first bucket", () => {
    const rows = selectRows([
      file(
        "Db/Mission/No due.md",
        `---
status: open
---

- [ ] no due task
`,
      ),
      file(
        "Db/Mission/Today.md",
        `---
status: open
---

- [ ] today task 📅 2026-07-07
`,
      ),
    ], "open", "*");

    const buckets = buildBoardBuckets(
      taskItems(rows),
      now,
    );

    expect(buckets.map((bucket) => bucket.key)).toEqual(["noDue", "today"]);
    expect(itemNames(buckets[0]!.days[0]!.items)).toEqual(["No due"]);
  });

  it("groups month buckets by exact day", () => {
    const rows = selectRows([
      file(
        "Db/Mission/Later.md",
        `---
status: open
---

- [ ] later task 📅 2026-07-20
`,
      ),
      file(
        "Db/Mission/Sooner.md",
        `---
status: open
---

- [ ] sooner task 📅 2026-07-13
`,
      ),
    ], "open", "*");

    const buckets = buildBoardBuckets(
      taskItems(rows),
      now,
    );

    expect(buckets).toHaveLength(1);
    expect(buckets[0]!.key).toBe("thisMonth");
    expect(buckets[0]!.days.map((day) => day.label)).toEqual([
      "July 13 - Monday",
      "July 20 - Monday",
    ]);
  });

  it("preserves context and title ordering within a day", () => {
    const rows = selectRows([
      file(
        "Db/Mission/Mission B.md",
        `---
status: open
---

- [ ] mission b 📅 2026-07-13
`,
      ),
      file(
        "Db/Mission/Mission A.md",
        `---
status: open
---

- [ ] mission a 📅 2026-07-13
`,
      ),
      file(
        "Db/Growth/Growth.md",
        `---
status: open
---

- [ ] growth 📅 2026-07-13
`,
      ),
    ], "open", "*");

    const buckets = buildBoardBuckets(
      taskItems(rows),
      now,
    );

    expect(itemNames(buckets[0]!.days[0]!.items)).toEqual([
      "Growth",
      "Mission A",
      "Mission B",
    ]);
  });

  it("places vacation markers in their matching bucket days", () => {
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
    const marker = {
      ts: isoToTs("2026-07-13"),
      dateLabel: "07-13",
      yearLabel: "",
      dayLabel: "Mon",
      reason: "custom" as const,
      label: "Vacation",
    };

    const buckets = buildBoardBuckets(mergeItems(rows, [marker]), now);

    expect(buckets[0]!.key).toBe("thisMonth");
    expect(buckets[0]!.days.map((day) => day.key)).toEqual([
      "2026-07-13",
      "2026-07-20",
    ]);
    expect(itemNames(buckets[0]!.days[0]!.items)).toEqual(["Vacation"]);
    expect(itemNames(buckets[0]!.days[1]!.items)).toEqual(["Trip"]);
  });
});
