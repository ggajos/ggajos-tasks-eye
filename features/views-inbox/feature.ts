import { defineFeature } from "../types";

export default defineFeature({
  title: "Inbox view",
  summary:
    "Inbox collects notes that need a small repair before the workflow can treat them reliably.",
  acceptanceCriteria: [
    "Inbox shows notes with validation issues.",
    "Inbox includes notes with issues whether their status is open, closed, or unsupported.",
    "Inbox reuses the note-first board rows and due-date buckets from Open.",
    "Every Inbox bucket starts expanded so validation issues are immediately visible.",
    "Inbox rows keep their validation messages, note links, context badges, and row actions.",
    "Inbox celebrates an all-clear state with `Inbox zero.` and a large check icon when no notes need attention.",
  ],
  screenshots: [
    {
      slug: "repair-queue",
      title: "An issue list with clear next steps",
      alt: "Inbox board grouping realistic workflow issues into expanded due-date buckets",
    },
    {
      slug: "all-clear",
      title: "A healthy inbox",
      alt: "Tasks Eye Inbox view celebrating that no notes need attention",
    },
  ],
});
