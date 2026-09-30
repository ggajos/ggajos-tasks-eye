import { defineFeature } from "../types";

export default defineFeature({
  title: "Filter by context",
  summary:
    "Use the toolbar to show one branch of your note tree in Focus, Open, Inbox, or Done.",
  acceptanceCriteria: [
    "A first-level note is its own context and deeper descendants inherit that context.",
    "Notes can live in unrelated folders without changing their context.",
    "Select the root note’s name to show the whole tree; without a unique indexed root, this option is `*`.",
    "If a saved context no longer exists, the board returns to the whole-tree filter.",
    "Changing the filter only changes what you see; your notes are untouched.",
  ],
  screenshots: [
    {
      slug: "filtered-board",
      title: "Filtered board",
      alt: "Open board filtered to the Mission context",
    },
  ],
});
