import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectStatusGroups } from "../src/completedTasks";
import { isoToTs } from "../src/date";
import {
  buildEyeFileFromMarkdown,
  buildEyeFilesFromMarkdown,
} from "../src/indexer";
import type { RenderItem } from "../src/model";
import {
  bucketForTs,
  buildBoardBuckets,
  buildRowModel,
  buildRowModels,
  compareRowModels,
  mergeItems,
  selectRowModels,
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
  it("builds models once before selecting multiple context-filtered modes", () => {
    const files = buildEyeFilesFromMarkdown([
      {
        path: "Focus.md",
        markdown:
          "---\nstatus: open\nup: -\n---\n\n- [ ] focus task 📅 2026-07-08",
      },
      {
        path: "Invalid.md",
        markdown: "---\nstatus: reviewing\nup: -\n---\n",
      },
    ]);
    const models = buildRowModels(files);

    expect(
      selectRowModels(models, files, "focus", "*").map(
        (row) => row.file.basename,
      ),
    ).toEqual(["Focus"]);
    expect(
      selectRowModels(models, files, "inbox", "*").map(
        (row) => row.file.basename,
      ),
    ).toEqual(["Invalid", "Focus"]);
  });

  it("treats the explicit root as an ordinary note in every view", () => {
    const files = buildEyeFilesFromMarkdown([
      {
        path: "Root.md",
        markdown: `---
status: open
up: -
---

- [x] reviewed ✅ 2026-07-08
- [ ] continue the work 📅 2026-07-08
`,
      },
    ]);

    expect(
      selectRows(files, "focus", "Root").map((row) => row.file.basename),
    ).toEqual(["Root"]);
    expect(
      selectRows(files, "open", "Root").map((row) => row.file.basename),
    ).toEqual(["Root"]);
    expect(Object.keys(collectStatusGroups(files, "2026-07-08", true))).toEqual(
      ["Root"],
    );
  });

  it("uses the up tree for row context fields", () => {
    const files = buildEyeFilesFromMarkdown([
      {
        path: "Root.md",
        markdown:
          "---\nstatus: closed\nup: -\n---\n\n- [x] reviewed ✅ 2026-07-08",
      },
      {
        path: "Contexts/Mission.md",
        markdown: "---\nstatus: closed\nup: [[Root]]\n---\n",
      },
      {
        path: "elsewhere/Deep.md",
        markdown:
          "---\nstatus: open\nup: [[Mission]]\n---\n\n- [ ] next 📅 2099-01-01",
      },
    ]);

    const root = buildRowModel(
      files.find((file) => file.basename === "Root")!,
      undefined,
      files,
    );
    const deep = buildRowModel(
      files.find((file) => file.basename === "Deep")!,
      undefined,
      files,
    );

    expect(root.contextKey).toBe("Root");
    expect(root.contextLabel).toBe("Root");
    expect(deep.contextKey).toBe("Mission");
    expect(deep.contextLabel).toBe("Mission");
  });

  it("orders equal due dates by task priority before title", () => {
    const rows = [
      buildRowModel(
        buildEyeFileFromMarkdown(
          "Mission/Alpha.md",
          `---
status: open
up: -
---

- [ ] lower priority ⏬ 📅 2026-07-08
`,
        ),
      ),
      buildRowModel(
        buildEyeFileFromMarkdown(
          "Mission/Zulu.md",
          `---
status: open
up: -
---

- [ ] higher priority 🔺 📅 2026-07-08
`,
        ),
      ),
    ].sort(compareRowModels);

    expect(rows.map((row) => row.file.basename)).toEqual(["Zulu", "Alpha"]);
  });

  it("falls back to the first uncompleted task when no due dates exist", () => {
    const row = buildRowModel(fixture("no-due.md"));

    expect(row.actionLabel).toBe("first undated task");
    expect(row.earliestDue).toBeNull();
  });

  it("ignores completed tasks when selecting the next action", () => {
    const row = buildRowModel(
      file(
        "Mission/Done ignored.md",
        `---
status: open
up: -
---

- [x] completed earlier 📅 2000-01-01 ✅ 2000-01-01
- [ ] open later 📅 2026-06-20
`,
      ),
    );

    expect(row.actionLabel).toBe("open later 📅 2026-06-20");
    expect(row.earliestDue).toBe(isoToTs("2026-06-20"));
  });
});

describe("board grouping", () => {
  const now = new Date(2026, 6, 7);

  it("assigns due dates to visible board buckets", () => {
    expect(bucketForTs(null, now)).toBe("noDue");
    expect(bucketForTs(isoToTs("2026-07-06"), now)).toBe("overdue");
    expect(bucketForTs(isoToTs("2026-07-07"), now)).toBe("today");
    expect(bucketForTs(isoToTs("2026-07-08"), now)).toBe("tomorrow");
    expect(bucketForTs(isoToTs("2026-07-09"), now)).toBe("thisWeek");
    expect(bucketForTs(isoToTs("2026-07-12"), now)).toBe("thisWeek");
    expect(bucketForTs(isoToTs("2026-07-13"), now)).toBe("nextWeek");
    expect(bucketForTs(isoToTs("2026-07-19"), now)).toBe("nextWeek");
    expect(bucketForTs(isoToTs("2026-07-20"), now)).toBe("thisMonth");
    expect(bucketForTs(isoToTs("2026-08-01"), now)).toBe("nextMonth");
    expect(bucketForTs(isoToTs("2026-09-01"), now)).toBe("future");
  });

  it("lets week buckets take precedence across a month boundary", () => {
    const monthEnd = new Date(2026, 6, 30);

    expect(bucketForTs(isoToTs("2026-07-31"), monthEnd)).toBe("tomorrow");
    expect(bucketForTs(isoToTs("2026-08-01"), monthEnd)).toBe("thisWeek");
    expect(bucketForTs(isoToTs("2026-08-03"), monthEnd)).toBe("nextWeek");
    expect(bucketForTs(isoToTs("2026-08-09"), monthEnd)).toBe("nextWeek");
    expect(bucketForTs(isoToTs("2026-08-10"), monthEnd)).toBe("nextMonth");
  });

  it("orders overdue and no-due work before today", () => {
    const rows = selectRows(
      [
        file(
          "Mission/Overdue.md",
          `---
status: open
up: -
---

- [ ] overdue task 📅 2026-07-06
`,
        ),
        file(
          "Mission/No due.md",
          `---
status: open
up: -
---

- [ ] no due task
`,
        ),
        file(
          "Mission/Today.md",
          `---
status: open
up: -
---

- [ ] today task 📅 2026-07-07
`,
        ),
      ],
      "open",
      "*",
    );

    const buckets = buildBoardBuckets(taskItems(rows), now);

    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "overdue",
      "noDue",
      "today",
    ]);
    expect(itemNames(buckets[1]!.days[0]!.items)).toEqual(["No due"]);
  });

  it("groups month buckets by exact day", () => {
    const rows = selectRows(
      [
        file(
          "Mission/Later.md",
          `---
status: open
up: -
---

- [ ] later task 📅 2026-07-27
`,
        ),
        file(
          "Mission/Sooner.md",
          `---
status: open
up: -
---

- [ ] sooner task 📅 2026-07-20
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
      "July 20 - Monday",
      "July 27 - Monday",
    ]);
  });

  it("preserves context and title ordering within a day", () => {
    const rows = selectRows(
      [
        file(
          "Mission/Mission B.md",
          `---
status: open
up: -
---

- [ ] mission b 📅 2026-07-13
`,
        ),
        file(
          "Mission/Mission A.md",
          `---
status: open
up: -
---

- [ ] mission a 📅 2026-07-13
`,
        ),
        file(
          "Growth/Growth.md",
          `---
status: open
up: -
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
up: -
---

- [ ] after vacation 📅 2026-07-27
`,
        ),
      ],
      "open",
      "*",
    );
    const marker = {
      ts: isoToTs("2026-07-20"),
      dateLabel: "07-20",
      yearLabel: "",
      dayLabel: "Mon",
      reasons: [{ kind: "personal" as const, label: "Vacation" }],
      label: "Vacation",
    };

    const buckets = buildBoardBuckets(mergeItems(rows, [marker]), now);

    expect(buckets[0]!.key).toBe("thisMonth");
    expect(buckets[0]!.days.map((day) => day.key)).toEqual([
      "2026-07-20",
      "2026-07-27",
    ]);
    expect(itemNames(buckets[0]!.days[0]!.items)).toEqual(["Vacation"]);
    expect(itemNames(buckets[0]!.days[1]!.items)).toEqual(["Trip"]);
  });
});
