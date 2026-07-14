import { describe, expect, it } from "vitest";
import { collectCompletedTasks, groupCompletedTasks } from "../../src/dailyCore";
import { file } from "../testSupport";

describe("Done mode feature", () => {
  it("collects completed tasks for the selected date", () => {
    const tasks = collectCompletedTasks([
      file(
        "Db/Architecture/Architecture Governance.md",
        `---
status: closed
---

- [x] Approved ADR-042 for tenant isolation ✅ 2026-07-08
- [x] Reviewed last quarter's platform roadmap ✅ 2026-07-07
`,
      ),
    ], "2026-07-08");

    expect(tasks.map((task) => task.text)).toEqual([
      "Approved ADR-042 for tenant isolation",
    ]);
  });

  it("groups completed tasks by context and note", () => {
    const grouped = groupCompletedTasks([
      {
        context: "Architecture",
        fileName: "Architecture Governance",
        filePath: "Db/Architecture/Architecture Governance.md",
        text: "Approved ADR-042",
      },
    ]);

    expect(grouped.Architecture?.["Architecture Governance"]?.[0]?.text)
      .toBe("Approved ADR-042");
  });
});
