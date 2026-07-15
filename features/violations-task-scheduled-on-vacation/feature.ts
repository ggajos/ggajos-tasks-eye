import { note, violationFixture } from "../fixtures";
import { defineFeature } from "../types";

export default defineFeature({
  title: "Task scheduled on vacation",
  summary:
    "An unfinished task with a due date on a configured unavailable day is reported as an Inbox violation.",
  acceptanceCriteria: [
    "Unfinished tasks due on configured vacation dates are reported in Inbox.",
    "The violation includes the due date and vacation reason.",
    "Rows show only the earliest vacation collision for the note.",
    "Tasks on normal working days do not trigger this violation.",
    "The violation is visible in both Inbox and Open.",
  ],
  violation: {
    code: "task-on-vacation",
    appearsInOpen: true,
    fixture: violationFixture(note(
      "Case Studies/Architecture Offsite.md",
      `---
status: open
---

# Architecture Offsite

- [ ] Reschedule the platform strategy review away from OOO 📅 2026-07-13
`,
    )),
  },
  screenshots: [
    {
      slug: "violation",
      title: "Offsite review scheduled during OOO",
      alt: "Inbox row showing a platform strategy review scheduled during OOO",
    },
    {
      slug: "open",
      title: "OOO conflict in Open",
      alt: "Open row showing an architecture offsite review scheduled during OOO",
    },
  ],
});
