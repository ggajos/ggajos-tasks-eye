import { describe, expect, it } from "vitest";
import { rowErrors } from "../../src/model";
import type { AvailabilityConfig } from "../../src/vacation";
import { file } from "../testSupport";

const availability: AvailabilityConfig = {
  nonWorkingWeekdays: [0, 6],
  publicHolidays: [],
  personalTimeOff: [
    {
      id: "offsite",
      from: "2026-07-13",
      to: "2026-07-18",
      label: "",
    },
  ],
};

describe("Task scheduled on vacation violation", () => {
  it("shows only the earliest vacation collision in row errors", () => {
    expect(
      rowErrors(
        file(
          "Architecture/Architecture Offsite.md",
          `---
status: open
---

- [ ] first 📅 2026-07-13
- [ ] later 📅 2026-07-18
`,
        ),
        availability,
      ),
    ).toMatchObject([
      {
        code: "task-on-vacation",
        message: "Task is due on an unavailable day: 2026-07-13 (Vacation).",
      },
    ]);
  });
});
