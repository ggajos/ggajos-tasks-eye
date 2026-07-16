import { describe, expect, it } from "vitest";
import { rowErrors } from "../../src/model";
import { file } from "../testSupport";

describe("Task scheduled on vacation violation", () => {
  it("shows only the earliest vacation collision in row errors", () => {
    expect(rowErrors(file(
      "Architecture/Architecture Offsite.md",
      `---
status: open
---

- [ ] first 📅 2026-07-13
- [ ] later 📅 2026-07-18
`,
    ))).toMatchObject([{
      code: "task-on-vacation",
      message: "Task is due on an unavailable day: 2026-07-13 (vacation).",
    }]);
  });
});
