import { describe, expect, it } from "vitest";
import { collectCompletedTasks, groupCompletedTasks } from "../../src/dailyCore";
import { file } from "../testSupport";

describe("Done view feature", () => {
  it("collects completed tasks for the selected date", () => {
    const tasks = collectCompletedTasks([
      file(
        "Db/Growth/Completed Example.md",
        `---
status: closed
---

- [x] Review the completed task view ✅ 2026-07-08
- [x] Older task ✅ 2026-07-07
`,
      ),
    ], "2026-07-08");

    expect(tasks.map((task) => task.text)).toEqual([
      "Review the completed task view",
    ]);
  });

  it("groups completed tasks by context and note", () => {
    const grouped = groupCompletedTasks([
      {
        context: "Growth",
        fileName: "Completed Example",
        filePath: "Db/Growth/Completed Example.md",
        text: "Review",
      },
    ]);

    expect(grouped.Growth?.["Completed Example"]?.[0]?.text).toBe("Review");
  });
});
