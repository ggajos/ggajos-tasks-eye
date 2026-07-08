import { describe, expect, it } from "vitest";
import {
  parseTaskLine,
  replaceTaskLine,
  shiftDueDateInText,
  shiftTaskDueInMarkdown,
  stripDueDate,
} from "../src/taskParsing";

describe("task parsing", () => {
  it("parses task completion, text, due date, and line number", () => {
    const task = parseTaskLine("- [ ] Review 🔁 every week 📅 2026-07-08", 7);

    expect(task).toMatchObject({
      completed: false,
      text: "Review 🔁 every week 📅 2026-07-08",
      dueIso: "2026-07-08",
      line: 7,
    });
  });

  it("treats any non-space checkbox marker as completed", () => {
    const task = parseTaskLine("- [x] Done ✅ 2026-07-01", 0);

    expect(task?.completed).toBe(true);
    expect(task?.dueIso).toBeNull();
  });

  it("shifts only the first due date marker", () => {
    expect(shiftDueDateInText("- [ ] Review 📅 2026-07-08", 7))
      .toBe("- [ ] Review 📅 2026-07-15");
  });

  it("strips due date markers from display labels", () => {
    expect(stripDueDate("Review 📅 2026-07-08")).toBe("Review");
    expect(stripDueDate("Review ðŸ“… 2026-07-08")).toBe("Review");
    expect(stripDueDate("Review ð")).toBe("Review");
    expect(stripDueDate("Review 2026-07-08")).toBe("Review");
  });

  it("replaces the matched task line with multi-line Tasks output", () => {
    const task = parseTaskLine("- [ ] Recurring 🔁 every week 📅 2026-07-08", 2);
    expect(task).not.toBeNull();

    const markdown = [
      "---",
      "status: open",
      "- [ ] Recurring 🔁 every week 📅 2026-07-08",
      "",
    ].join("\n");

    const updated = replaceTaskLine(
      markdown,
      task!,
      "- [x] Recurring 🔁 every week 📅 2026-07-08 ✅ 2026-07-07\n- [ ] Recurring 🔁 every week 📅 2026-07-15",
    );

    expect(updated).toContain("✅ 2026-07-07");
    expect(updated).toContain("📅 2026-07-15");
  });

  it("updates the exact due line in markdown", () => {
    const task = parseTaskLine("- [ ] Shift me 📅 2026-07-08", 4);
    expect(task).not.toBeNull();

    const markdown = [
      "---",
      "status: open",
      "---",
      "",
      "- [ ] Shift me 📅 2026-07-08",
    ].join("\n");

    expect(shiftTaskDueInMarkdown(markdown, task!, -1)).toContain(
      "📅 2026-07-07",
    );
  });
});
