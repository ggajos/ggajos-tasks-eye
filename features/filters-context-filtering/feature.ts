import { defineFeature } from "../types";

export default defineFeature({
  title: "Filter by context",
  summary:
    "Tasks Eye derives context labels relative to the notes folder and uses the toolbar filter to narrow board and Done views.",
  acceptanceCriteria: [
    "Context labels preserve every relative folder segment, including casing, spacing, and numeric prefixes.",
    "A nested folder such as `Mission/Platform` is displayed exactly as `Mission/Platform`.",
    "Unknown persisted filters fall back to `All`.",
    "Changing the toolbar filter narrows visible rows without mutating notes.",
  ],
  screenshots: [
    {
      slug: "filtered-board",
      title: "Filtered board",
      alt: "Open board filtered to the Mission/Platform context",
    },
  ],
});
