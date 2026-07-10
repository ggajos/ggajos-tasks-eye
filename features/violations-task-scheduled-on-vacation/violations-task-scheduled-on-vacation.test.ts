import { describe, expect, it } from "vitest";
import { rowErrors } from "../../src/model";
import { file, violationCodes } from "../testSupport";

describe("Task scheduled on vacation violation", () => {
  it("reports unfinished tasks due on unavailable dates", () => {
    expect(violationCodes(file(
      "Db/Architecture/Architecture Offsite.md",
      "---\nstatus: open\n---\n\n- [ ] reschedule strategy review 📅 2026-07-13",
    ))).toContain("task-on-vacation");
  });

  it("shows only the earliest vacation collision in row errors", () => {
    expect(rowErrors(file(
      "Db/Architecture/Architecture Offsite.md",
      `---
status: open
---

- [ ] first 📅 2026-07-13
- [ ] later 📅 2026-07-18
`,
    ))).toMatchObject([{
      code: "task-on-vacation",
      message: "task scheduled on vacation: 2026-07-13 (custom)",
    }]);
  });
});
