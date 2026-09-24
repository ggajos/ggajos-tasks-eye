import { defineFeature } from "../types";

export default defineFeature({
  title: "Focus view",
  summary:
    "Focus presents open work due today or overdue as one flat, note-centered daily list.",
  acceptanceCriteria: [
    "Focus is the first navigation tab and the default for fresh or invalid settings.",
    "Open notes whose earliest unchecked dated task is due today or overdue appear in Focus.",
    "Undated, future, closed, and unsupported-status notes do not appear in Focus.",
    "Focus uses the same note-first rows, actions, context filtering, availability markers, and validation messages as Open.",
    "Focus has no due-date bucket headers or day dividers.",
    "Rows show task priority: every row carries a left accent bar that ramps from urgent warm hues through neutral to faint greys, and below-normal rows are also de-emphasized.",
    "Focus keeps the first row sharp and dims every row below it so the eye rests on the single next action.",
    "An empty Focus view celebrates that `Today is handled.` with a large check icon.",
  ],
  screenshots: [
    {
      slug: "board",
      title: "Today's focus",
      alt: "Tasks Eye Focus view showing today's work and an overdue next-action warning",
    },
    {
      slug: "priority-and-dim",
      title: "Priority accents with a single sharp anchor",
      alt: "Tasks Eye Focus view with priority accent bars and every row below the first dimmed",
    },
    {
      slug: "all-clear",
      title: "A completed day",
      alt: "Tasks Eye Focus view celebrating that today's work is handled",
    },
  ],
});
