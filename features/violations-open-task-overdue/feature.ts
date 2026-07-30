import { note, violationFixture } from "../fixtures";
import { defineFeature } from "../types";

export default defineFeature({
  title: "Open task overdue",
  summary:
    "An open note whose earliest unchecked dated task is overdue is reported in Inbox.",
  acceptanceCriteria: [
    "The earliest unchecked task dated before today produces one overdue violation.",
    "The issue text is `Task is overdue: YYYY-MM-DD.` using the task's due date.",
    "Tasks due today or later and completed tasks do not trigger the issue.",
    "Closed notes and notes with unsupported statuses do not trigger the issue.",
    "The issue is rendered by the same row validation UI in Focus, Open, and Inbox.",
  ],
  violation: {
    code: "open-task-overdue",
    appearsInOpen: true,
    fixture: violationFixture(
      note("Case Studies/Launch Readiness.md", {
        status: "open",
        tasks: [
          {
            text: "Resolve the overdue launch-readiness decision",
            due: "2026-07-07",
          },
        ],
      }),
    ),
  },
  screenshots: [
    {
      slug: "violation",
      title: "Overdue next action in Inbox",
      alt: "Inbox row showing an overdue launch-readiness task",
    },
    {
      slug: "open",
      title: "Overdue next action in Open",
      alt: "Open row showing the shared overdue validation warning",
    },
  ],
});
