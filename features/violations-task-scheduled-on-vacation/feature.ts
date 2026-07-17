import { note, violationFixture } from "../fixtures";
import { defineFeature } from "../types";

export default defineFeature({
  title: "Task due on an unavailable day",
  summary:
    "An unchecked task due on a configured unavailable day is reported as an Inbox issue.",
  acceptanceCriteria: [
    "Unchecked tasks due on configured non-working weekdays, public holidays, or personal time off are reported in Inbox.",
    "The issue includes the due date and every named availability reason.",
    "Rows show only the earliest vacation collision for the note.",
    "Tasks on normal working days do not trigger this issue.",
    "The issue is visible in both Inbox and Open.",
  ],
  violation: {
    code: "task-on-vacation",
    appearsInOpen: true,
    fixture: violationFixture(
      note(
        "Case Studies/Architecture Offsite.md",
        `---
status: open
---

# Architecture Offsite

- [ ] Reschedule the platform strategy review away from OOO 📅 2026-07-13
`,
      ),
    ),
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
