import { defineFeature } from "../types";

export default defineFeature({
  title: "Inbox view",
  summary:
    "Inbox collects notes that need workflow cleanup, regardless of their current status.",
  acceptanceCriteria: [
    "Inbox shows notes with validation issues.",
    "Inbox includes notes with issues regardless of whether their status is open, hold, or closed.",
    "Inbox rows show the same note links, context badges, and row actions as other task rows.",
    "Inbox displays an all-clear empty state when no notes need attention.",
  ],
  screenshots: [
    {
      slug: "repair-queue",
      title: "Notes that need attention",
      alt: "Crowded Inbox showing imported notes that need workflow cleanup",
    },
  ],
});
