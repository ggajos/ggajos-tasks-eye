import { describe, expect, it } from "vitest";
import { buildRowModel } from "../../src/model";
import { shiftTaskDueInMarkdown } from "../../src/taskParsing";
import { file } from "../testSupport";

describe("Board task controls feature", () => {
  it("targets the earliest unfinished due task in a board row", () => {
    const row = buildRowModel(file(
      "Db/Mission/Allegro/Invoice Sync.md",
      `---
status: open
---

- [ ] later 📅 2026-07-15
- [ ] earlier 📅 2026-07-08
`,
    ));

    expect(row.actionLabel).toBe("earlier");
    expect(row.earliestTask?.dueIso).toBe("2026-07-08");
  });

  it("shifts the represented task line without changing unrelated tasks", () => {
    const note = file(
      "Db/Mission/Allegro/Invoice Sync.md",
      `---
status: open
---

- [ ] first 📅 2026-07-08
- [ ] second 📅 2026-07-15
`,
    );
    const row = buildRowModel(note);

    const updated = shiftTaskDueInMarkdown(
      note.tasks.map((task) => task.lineText).join("\n"),
      row.earliestTask!,
      1,
    );

    expect(updated).toContain("first 📅 2026-07-09");
    expect(updated).toContain("second 📅 2026-07-15");
  });
});
