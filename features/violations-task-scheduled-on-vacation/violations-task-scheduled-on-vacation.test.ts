import { describe, expect, it } from "vitest";
import { rowErrors, validateFile } from "../../src/model";
import { file } from "../testSupport";

describe("Task scheduled on vacation violation", () => {
  it("reports unfinished tasks due on unavailable dates", () => {
    expect(validateFile(file(
      "Db/Life/Vacation Collision.md",
      "---\nstatus: open\n---\n\n- [ ] move this 📅 2026-07-13",
    ))).toContain("task scheduled on vacation: 2026-07-13 (custom)");
  });

  it("shows only the earliest vacation collision in row errors", () => {
    expect(rowErrors(file(
      "Db/Life/Vacation Collision.md",
      `---
status: open
---

- [ ] first 📅 2026-07-13
- [ ] later 📅 2026-07-18
`,
    ))).toEqual([
      "task scheduled on vacation: 2026-07-13 (custom)",
    ]);
  });
});
