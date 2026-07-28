import { defineFeature } from "../types";

export default defineFeature({
  title: "Focus view",
  summary:
    "Focus presents open work due today or overdue as one flat, note-centered daily list.",
  acceptanceCriteria: [
    "Focus is the first navigation tab and the default for fresh or invalid settings.",
    "Open notes whose earliest unchecked dated task is due today or overdue appear in Focus.",
    "Undated, future, Hold, and closed notes do not appear in Focus.",
    "Focus uses the same task-first rows, actions, context filtering, availability markers, and validation messages as Open.",
    "Focus has no due-date bucket headers or day dividers.",
    "An empty Focus view says `No open work due today.`",
  ],
  screenshots: [
    {
      slug: "board",
      title: "Today's focus",
      alt: "Tasks Eye Focus view showing today's work and an overdue next-action warning",
    },
  ],
});
