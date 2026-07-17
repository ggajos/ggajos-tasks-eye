import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isoToTs } from "../src/date";
import { buildEyeFileFromMarkdown } from "../src/indexer";
import type { RenderItem } from "../src/model";
import {
  bucketForTs,
  buildBoardBuckets,
  buildRowModel,
  mergeItems,
  selectRows,
} from "../src/model";
import type { EyeFile, RowModel } from "../src/types";

function fixture(name: string, path = `Mission/${name}`): EyeFile {
  const markdown = readFileSync(join(__dirname, "fixtures", name), "utf8");
  return buildEyeFileFromMarkdown(path, markdown);
}

function file(path: string, markdown: string): EyeFile {
  return buildEyeFileFromMarkdown(path, markdown);
}

function taskItems(rows: RowModel[]): RenderItem[] {
  return rows.map((model) => ({ kind: "task", model }));
}

function itemNames(items: RenderItem[]): string[] {
  return items.map((item) =>
    item.kind === "task" ? item.model.file.basename : item.marker.label,
  );
}

describe("row model", () => {
  it("falls back to the first uncompleted task when no due dates exist", () => {
    const row = buildRowModel(fixture("no-due.md"));

    expect(row.actionLabel).toBe("first undated task");
    expect(row.dateLabel).toBe("No Due Date");
  });

  it("ignores completed tasks when selecting the next action", () => {
    const row = buildRowModel(
      file(
        "Mission/Done ignored.md",
        `---
status: open
---

- [x] completed earlier 📅 2000-01-01 ✅ 2000-01-01
- [ ] open later 📅 2026-06-20
`,
      ),
    );

    expect(row.actionLabel).toBe("open later");
    expect(row.dateLabel).toBe("06-20");
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
    const rows = selectRows(
      [
        file(
          "Mission/No due.md",
          `---
status: open
---

- [ ] no due task
`,
        ),
        file(
          "Mission/Today.md",
          `---
status: open
---

- [ ] today task 📅 2026-07-07
`,
        ),
      ],
      "open",
      "*",
    );

    const buckets = buildBoardBuckets(taskItems(rows), now);

    expect(buckets.map((bucket) => bucket.key)).toEqual(["noDue", "today"]);
    expect(itemNames(buckets[0]!.days[0]!.items)).toEqual(["No due"]);
  });

  it("groups month buckets by exact day", () => {
    const rows = selectRows(
      [
        file(
          "Mission/Later.md",
          `---
status: open
---

- [ ] later task 📅 2026-07-20
`,
        ),
        file(
          "Mission/Sooner.md",
          `---
status: open
---

- [ ] sooner task 📅 2026-07-13
`,
        ),
      ],
      "open",
      "*",
    );

    const buckets = buildBoardBuckets(taskItems(rows), now);

    expect(buckets).toHaveLength(1);
    expect(buckets[0]!.key).toBe("thisMonth");
    expect(buckets[0]!.days.map((day) => day.label)).toEqual([
      "July 13 - Monday",
      "July 20 - Monday",
    ]);
  });

  it("preserves context and title ordering within a day", () => {
    const rows = selectRows(
      [
        file(
          "Mission/Mission B.md",
          `---
status: open
---

- [ ] mission b 📅 2026-07-13
`,
        ),
        file(
          "Mission/Mission A.md",
          `---
status: open
---

- [ ] mission a 📅 2026-07-13
`,
        ),
        file(
          "Growth/Growth.md",
          `---
status: open
---

- [ ] growth 📅 2026-07-13
`,
        ),
      ],
      "open",
      "*",
    );

    const buckets = buildBoardBuckets(taskItems(rows), now);

    expect(itemNames(buckets[0]!.days[0]!.items)).toEqual([
      "Growth",
      "Mission A",
      "Mission B",
    ]);
  });

  it("places vacation markers in their matching bucket days", () => {
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
