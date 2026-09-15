import { defineFeature } from "../types";

export default defineFeature({
  title: "Filter by context",
  summary:
    "Tasks Eye derives context labels from the first-level ancestor in an explicit `up` note tree and uses the toolbar filter to narrow Focus, board, and Done views.",
  acceptanceCriteria: [
    "A first-level note is its own context and deeper descendants inherit that context.",
    "Notes can live in unrelated folders without changing their context.",
    "The unique root basename is the global filter option.",
    "Unknown persisted filters fall back to the root global option.",
    "Changing the toolbar filter narrows visible rows without mutating notes.",
  ],
  screenshots: [
    {
      slug: "filtered-board",
      title: "Filtered board",
      alt: "Open board filtered to the Mission context",
    },
  ],
});
