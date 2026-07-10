import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "violations-open-note-without-due-date",
  title: "Violation: open note has no task with due date",
  summary:
    "An open note is invalid when it has unchecked tasks but none of them has a Tasks due date.",
  userValue:
    "The user can schedule at least one next action instead of leaving active work without a planning date.",
  acceptanceCriteria: [
    "`status: open` notes with unchecked tasks but no due dates are reported in Inbox.",
    "Missing or blank status is treated as Open for this rule.",
    "One unchecked task with a due date is enough to satisfy the rule, even when other unchecked tasks are undated.",
    "Completed tasks with due dates do not satisfy the rule.",
    "Hold, closed, and archived notes do not trigger this specific violation.",
    "The violation is visible in both Inbox and Open.",
  ],
  fixturePaths: [],
  violation: {
    message: "open note has no uncompleted task with due date",
    appearsInOpen: true,
    sampleNote: {
      path: "Db/Violation Samples/Missing Due Date.md",
      markdown: `---
status: open
---

- [ ] Choose the next dated action
`,
    },
  },
  screenshots: [
    {
      slug: "violation",
      title: "Missing due date violation",
      alt: "Inbox row showing an open note without an unchecked task due date",
    },
    {
      slug: "open",
      title: "Missing due date in Open",
      alt: "Open row showing an open note without an unchecked task due date",
    },
  ],
} satisfies FeatureDefinition;
