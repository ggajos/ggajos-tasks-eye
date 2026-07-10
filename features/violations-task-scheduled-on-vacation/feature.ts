import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "violations-task-scheduled-on-vacation",
  title: "Violation: task scheduled on vacation",
  summary:
    "An unfinished task with a due date on a configured unavailable day is reported as an Inbox violation.",
  userValue:
    "The user can reschedule work before it lands on weekends, holidays, or custom OOO days.",
  acceptanceCriteria: [
    "Unfinished tasks due on configured vacation dates are reported in Inbox.",
    "The violation includes the due date and vacation reason.",
    "Rows show only the earliest vacation collision for the note.",
    "Tasks on normal working days do not trigger this violation.",
    "The violation is visible in both Inbox and Open.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Life/Vacation Collision.md",
  ],
  violation: {
    message: "task scheduled on vacation: 2026-07-13 (custom)",
    appearsInOpen: true,
    sampleNote: {
      path: "Db/Violation Samples/Vacation Task.md",
      markdown: `---
status: open
---

- [ ] Move cabin travel prep away from custom OOO day 📅 2026-07-13
`,
    },
  },
  screenshots: [
    {
      slug: "violation",
      title: "Vacation collision",
      alt: "Inbox row showing a task scheduled on vacation violation",
    },
    {
      slug: "open",
      title: "Vacation collision in Open",
      alt: "Open row showing a task scheduled on vacation violation",
    },
  ],
} satisfies FeatureDefinition;
