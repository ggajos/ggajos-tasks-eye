import { defineFeature } from "../types";

export default defineFeature({
  title: "Inbox view",
  summary:
    "Inbox collects notes that need a small repair before the workflow can treat them reliably.",
  acceptanceCriteria: [
    "Inbox shows notes with validation issues.",
    "Inbox includes notes with issues regardless of whether their status is open, hold, or closed.",
    "Inbox reuses the task-first board rows and due-date buckets from Open and Hold.",
    "Every Inbox bucket starts expanded so validation issues are immediately visible.",
    "Inbox rows keep their validation messages, note links, context badges, and row actions.",
    "Inbox displays an all-clear empty state when no notes need attention.",
  ],
  screenshots: [
    {
      slug: "repair-queue",
      title: "A repair queue with clear next steps",
      alt: "Inbox board grouping realistic workflow issues into expanded due-date buckets",
    },
  ],
});
