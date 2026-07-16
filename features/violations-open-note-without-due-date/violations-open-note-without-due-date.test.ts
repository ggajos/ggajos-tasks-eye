import { describe, expect, it } from "vitest";
import { file, violationCodes, violationMessages } from "../testSupport";

const VIOLATION = "open-without-due-date";

describe("Open note without due date violation", () => {
  it.each([
    ["missing", "- [ ] choose next action"],
    ["blank", "---\nstatus:\n---\n\n- [ ] choose next action"],
  ])("treats %s status as open", (_label, markdown) => {
    expect(violationCodes(file(
      "Growth/Default Open.md",
      markdown,
    ))).toContain(VIOLATION);
  });

  it("allows one dated unchecked task alongside undated tasks", () => {
    expect(violationCodes(file(
      "Growth/Scheduled Active.md",
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
    expect(violationCodes(file(
      "Growth/Unscheduled Active.md",
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
      expect(violationCodes(file(
        `Growth/${status}.md`,
        `---\nstatus: ${status}\n---\n\n- [ ] choose next action`,
      ))).not.toContain(VIOLATION);
    },
  );

  it("keeps the existing empty-open-note violation separate", () => {
    const violations = violationCodes(file(
      "Growth/Empty.md",
      "---\nstatus: open\n---\n",
    ));

    expect(violations).toContain("open-without-uncompleted-tasks");
    expect(violations).not.toContain(VIOLATION);
  });

  it("asks for a due date on an unchecked task", () => {
    expect(violationMessages(file(
      "Growth/Unscheduled.md",
      "---\nstatus: open\n---\n\n- [ ] choose next action",
    ))).toContain(
      "Open note needs a due date on at least one unchecked task.",
    );
  });
});
