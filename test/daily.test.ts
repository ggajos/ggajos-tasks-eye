import { describe, expect, it } from "vitest";
import {
  cleanCompletedTaskText,
  collectCompletedTasks,
  formatCompletedMarkdown,
  formatNavMarkdown,
  groupCompletedTasks,
  pickNeighbors,
} from "../src/dailyCore";
import { buildEyeFileFromMarkdown } from "../src/indexer";

function file(path: string, markdown: string) {
  return buildEyeFileFromMarkdown(path, markdown);
}

describe("daily completed summary", () => {
  it("cleans completion dates and tags from task text", () => {
    expect(cleanCompletedTaskText("Ship feature #work ✅ 2026-07-07"))
      .toBe("Ship feature");
  });

  it("collects completed tasks for the target date", () => {
    const files = [
      file(
        "Db/Mission/Project.md",
        `---
status: open
---

- [x] Done today ✅ 2026-07-07
- [x] Done yesterday ✅ 2026-07-06
- [ ] Not done ✅ 2026-07-07
`,
      ),
    ];

    expect(collectCompletedTasks(files, "2026-07-07")).toEqual([
      {
        text: "Done today",
        context: "mission",
        fileName: "Project",
        filePath: "Db/Mission/Project.md",
      },
    ]);
  });

  it("formats grouped completed tasks as nested markdown", () => {
    const tasks = [
      {
        text: "A",
        context: "mission",
        fileName: "Project",
        filePath: "Db/Mission/Project.md",
      },
      {
        text: "B",
        context: "mission",
        fileName: "Project",
        filePath: "Db/Mission/Project.md",
      },
      {
        text: "C",
        context: "growth",
        fileName: "Log",
        filePath: "Db/Growth/Log.md",
      },
    ];

    expect(formatCompletedMarkdown(groupCompletedTasks(tasks))).toEqual([
      "- growth",
      "\t- [[Log]]",
      "\t\t- ✅ C",
      "- mission",
      "\t- [[Project]]",
      "\t\t- ✅ A",
      "\t\t- ✅ B",
    ]);
  });
});

describe("daily navigation", () => {
  it("picks nearest previous and next daily notes", () => {
    expect(pickNeighbors([
      "2026-07-01 - Wed",
      "2026-07-03 - Fri",
      "not daily",
      "2026-07-06 - Mon",
    ], "2026-07-04")).toEqual({
      prev: "2026-07-03 - Fri",
      next: "2026-07-06 - Mon",
    });
  });

  it("formats nav markdown", () => {
    expect(formatNavMarkdown({
      prev: "2026-07-03 - Fri",
      next: "2026-07-06 - Mon",
    })).toBe(
      "[[2026-07-03 - Fri|‹ 2026-07-03]] | [[T99 - System - Daily Note|Template]] | [[2026-07-06 - Mon|2026-07-06 ›]]",
    );
  });
});
