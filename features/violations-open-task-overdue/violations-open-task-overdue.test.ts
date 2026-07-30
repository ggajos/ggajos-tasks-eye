import { describe, expect, it } from "vitest";
import { file, violationCodes, violationMessages } from "../testSupport";

const VIOLATION = "open-task-overdue";

describe("Open task overdue violation", () => {
  it.each([
    ["missing", "- [ ] overdue 📅 2026-07-07"],
    ["blank", "---\nstatus:\n---\n\n- [ ] overdue 📅 2026-07-07"],
  ])("treats %s status as open", (_label, markdown) => {
    expect(violationCodes(file("Work/Default Open.md", markdown))).toContain(
      VIOLATION,
    );
  });

  it("reports only the earliest unchecked overdue task", () => {
    const subject = file(
      "Work/Overdue.md",
      `---
status: open
---

- [ ] later overdue 📅 2026-07-07
- [ ] earliest overdue 📅 2026-07-06
`,
    );

    expect(
      violationCodes(subject).filter((code) => code === VIOLATION),
    ).toEqual([VIOLATION]);
    expect(violationMessages(subject)).toContain(
      "Task is overdue: 2026-07-06.",
    );
  });

  it.each(["2026-07-08", "2026-07-09"])(
    "does not report an unchecked task due %s",
    (due) => {
      expect(
        violationCodes(file("Work/Current.md", `- [ ] current 📅 ${due}`)),
      ).not.toContain(VIOLATION);
    },
  );

  it("ignores completed overdue tasks", () => {
    expect(
      violationCodes(
        file(
          "Work/Completed.md",
          "- [x] completed 📅 2026-07-07 ✅ 2026-07-07",
        ),
      ),
    ).not.toContain(VIOLATION);
  });

  it.each(["reviewing", "closed"])("does not apply to %s notes", (status) => {
    expect(
      violationCodes(
        file(
          `Work/${status}.md`,
          `---\nstatus: ${status}\n---\n\n- [ ] overdue 📅 2026-07-07`,
        ),
      ),
    ).not.toContain(VIOLATION);
  });
});
