import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "violations-open-note-without-uncompleted-tasks",
  title: "Violation: open note has no uncompleted tasks",
  summary:
    "An open note is invalid when it has no unchecked task left to act on.",
  userValue:
    "The user can close, archive, or add a next action instead of letting empty active notes clutter planning.",
  acceptanceCriteria: [
    "`status: open` notes with no unchecked tasks are reported in Inbox.",
    "Missing or blank status is treated as Open for this rule.",
    "Open notes with at least one unchecked task do not trigger this violation.",
    "The violation is visible in both Inbox and Open.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Growth/Missing Task.md",
  ],
  violation: {
    message: "open note has no uncompleted tasks",
    appearsInOpen: true,
    sampleNote: {
      path: "Db/Violation Samples/No Unchecked Tasks.md",
      markdown: `---
status: open
---

This note intentionally has no unchecked tasks.
`,
    },
  },
  screenshots: [
    {
      slug: "violation",
      title: "Missing task violation",
      alt: "Inbox row showing an open note with no uncompleted tasks violation",
    },
    {
      slug: "open",
      title: "Missing task in Open",
      alt: "Open row showing an open note with no uncompleted tasks violation",
    },
  ],
} satisfies FeatureDefinition;
