import { note, violationFixture } from "../fixtures";
import { defineFeature } from "../types";

export default defineFeature({
  title: "Open note with no dated unchecked task",
  summary:
    "An open note needs a Tasks due date on at least one unchecked task.",
  acceptanceCriteria: [
    "`status: open` notes with unchecked tasks but no due dates are reported in Inbox.",
    "Missing or blank status is treated as Open for this rule.",
    "One unchecked task with a due date is enough to satisfy the rule, even when other unchecked tasks are undated.",
    "Completed tasks with due dates do not satisfy the rule.",
    "Hold, closed, and archived notes do not trigger this issue.",
    "The issue is visible in both Inbox and Open.",
  ],
  violation: {
    code: "open-without-due-date",
    appearsInOpen: true,
    fixture: violationFixture(
      note(
        "Case Studies/Platform Capability Map.md",
        `---
status: open
---

# Platform Capability Map

- [ ] Define the next review milestone for the capability map
`,
      ),
    ),
  },
  screenshots: [
    {
      slug: "violation",
      title: "Undated capability-map action",
      alt: "Inbox row showing an architecture capability-map action without a due date",
    },
    {
      slug: "open",
      title: "Undated action in Open",
      alt: "Open row showing an undated platform capability-map action",
    },
  ],
});
