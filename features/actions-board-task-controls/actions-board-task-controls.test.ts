import { describe, expect, it } from "vitest";
import { buildRowModel } from "../../src/model";
import { shiftTaskDueInMarkdown } from "../../src/taskParsing";
import { file } from "../testSupport";

describe("Board task controls feature", () => {
  it("targets the earliest unfinished due task in a board row", () => {
    const row = buildRowModel(
      file(
        "Mission/Platform/Billing Platform Modernization.md",
        `---
status: open
---

- [ ] Review the migration runbook 📅 2026-07-15
- [ ] Approve the billing event contract 📅 2026-07-08
`,
      ),
    );

    expect(row.actionLabel).toBe("Approve the billing event contract");
    expect(row.earliestTask?.dueIso).toBe("2026-07-08");
  });

  it("shifts the represented task line without changing unrelated tasks", () => {
    const note = file(
      "Mission/Platform/Billing Platform Modernization.md",
      `---
status: open
---

- [ ] Approve the billing event contract 📅 2026-07-08
- [ ] Review the migration runbook 📅 2026-07-15
`,
    );
    const row = buildRowModel(note);

    const updated = shiftTaskDueInMarkdown(
      note.tasks.map((task) => task.lineText).join("\n"),
      row.earliestTask!,
      1,
    );

    expect(updated).toContain(
      "Approve the billing event contract 📅 2026-07-09",
    );
    expect(updated).toContain("Review the migration runbook 📅 2026-07-15");
  });
});
