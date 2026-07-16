import { defineFeature } from "../types";

export default defineFeature({
  title: "Inbox view",
  summary:
    "Inbox collects notes that need a small repair before the workflow can treat them reliably.",
  acceptanceCriteria: [
    "Inbox shows notes with validation issues.",
    "Inbox includes notes with issues regardless of whether their status is open, hold, or closed.",
    "Inbox rows show the same note links, context badges, and row actions as other task rows.",
    "Inbox displays an all-clear empty state when no notes need attention.",
  ],
  screenshots: [
    {
      slug: "repair-queue",
      title: "A repair queue with clear next steps",
      alt: "Inbox showing realistic notes with different workflow issues and repair actions",
    },
  ],
});
