import { describe, expect, it } from "vitest";
import {
  cleanCompletedTaskText,
  formatCompletedMarkdown,
  formatNavMarkdown,
  groupCompletedTasks,
  pickNeighbors,
} from "../src/dailyCore";

describe("daily completed summary", () => {
  it("cleans completion dates and tags from task text", () => {
    expect(cleanCompletedTaskText("Ship feature #work ✅ 2026-07-07"))
      .toBe("Ship feature");
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
