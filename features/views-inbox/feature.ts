import { defineFeature } from "../types";

export default defineFeature({
  title: "Inbox view",
  summary:
    "Inbox is the repair queue that collects notes with validation violations, regardless of their current status.",
  acceptanceCriteria: [
    "Inbox shows notes with validation errors.",
    "Inbox includes invalid notes regardless of whether their status is open, hold, or closed.",
    "Inbox rows show the same note links, context badges, and row actions as other task rows.",
    "Inbox displays an all-clear empty state when no files violate the rules.",
  ],
  screenshots: [
    {
      slug: "repair-queue",
      title: "Repair queue",
      alt: "Crowded Inbox repair queue showing many imported notes with validation errors",
    },
  ],
});
