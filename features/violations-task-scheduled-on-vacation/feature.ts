import { note, violationFixture } from "../fixtures";
import { defineFeature } from "../types";

export default defineFeature({
  title: "Task due on an unavailable day",
  summary:
    "A note appears in Inbox when its earliest unchecked due date falls on an unavailable day.",
  acceptanceCriteria: [
    "Non-working weekdays, public holidays, and personal time off can cause a conflict on the note’s earliest unchecked due date.",
    "The issue includes the due date and every named availability reason.",
    "A conflict on a later task is hidden until that date becomes the note’s earliest unchecked due date.",
    "Tasks on normal working days do not trigger this issue.",
    "The issue is visible in both Inbox and Open.",
  ],
  violation: {
    code: "task-on-unavailable-day",
    appearsInOpen: true,
    fixture: violationFixture(
      note(
        "Case Studies/Architecture Offsite.md",
        `---
status: open
up: "[[Root]]"
---

# Architecture Offsite

- [ ] Reschedule the platform strategy review away from OOO 📅 2026-07-13
`,
      ),
      [
        note("Root.md", {
          status: "closed",
          up: "-",
          tasks: [{ text: "Reviewed the tree", completed: "2026-07-08" }],
        }),
      ],
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
