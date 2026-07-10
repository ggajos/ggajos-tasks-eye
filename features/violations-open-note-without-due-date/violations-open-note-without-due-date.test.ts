import { describe, expect, it } from "vitest";
import { selectRows, validateFile } from "../../src/model";
import { file, rowNames } from "../testSupport";

const VIOLATION = "open note has no uncompleted task with due date";

describe("Open note without due date violation", () => {
  it("reports open notes whose unchecked tasks are all undated", () => {
    expect(validateFile(file(
      "Db/Growth/Unscheduled Active.md",
      "---\nstatus: open\n---\n\n- [ ] choose next action\n- [ ] collect notes",
    ))).toContain(VIOLATION);
  });

  it.each([
    ["missing", "- [ ] choose next action"],
    ["blank", "---\nstatus:\n---\n\n- [ ] choose next action"],
  ])("treats %s status as open", (_label, markdown) => {
    expect(validateFile(file(
      "Db/Growth/Default Open.md",
      markdown,
    ))).toContain(VIOLATION);
  });

  it("allows one dated unchecked task alongside undated tasks", () => {
    expect(validateFile(file(
      "Db/Growth/Scheduled Active.md",
      [
        "---",
        "status: open",
        "---",
        "",
        "- [ ] collect notes",
        "- [ ] choose next action 📅 2026-07-20",
      ].join("\n"),
    ))).not.toContain(VIOLATION);
  });

  it("does not count a completed dated task", () => {
    expect(validateFile(file(
      "Db/Growth/Unscheduled Active.md",
      [
        "---",
        "status: open",
        "---",
        "",
        "- [x] old action 📅 2026-07-10 ✅ 2026-07-10",
        "- [ ] choose next action",
      ].join("\n"),
    ))).toContain(VIOLATION);
  });

  it.each(["hold", "closed", "archived"])(
    "does not apply to %s notes",
    (status) => {
      expect(validateFile(file(
        `Db/Growth/${status}.md`,
        `---\nstatus: ${status}\n---\n\n- [ ] choose next action`,
      ))).not.toContain(VIOLATION);
    },
  );

  it("keeps the existing empty-open-note violation separate", () => {
    const violations = validateFile(file(
      "Db/Growth/Empty.md",
      "---\nstatus: open\n---\n",
    ));

    expect(violations).toContain("open note has no uncompleted tasks");
    expect(violations).not.toContain(VIOLATION);
  });

  it("shows the violation in Inbox without removing the note from Open", () => {
    const files = [file(
      "Db/Growth/Unscheduled Active.md",
      "---\nstatus: open\n---\n\n- [ ] choose next action",
    )];

    expect(rowNames(selectRows(files, "open", "*"))).toEqual([
      "Unscheduled Active",
    ]);
    expect(rowNames(selectRows(files, "inbox", "*"))).toEqual([
      "Unscheduled Active",
    ]);
  });
});
