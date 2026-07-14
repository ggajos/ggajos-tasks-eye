import { defineFeature } from "../types";

export default defineFeature({
  title: "Context filtering",
  summary:
    "Tasks Eye derives context labels from `Db/` folders and uses the toolbar filter to narrow board and Done modes.",
  acceptanceCriteria: [
    "Folder paths below `Db/` produce stable context keys and display labels.",
    "Nested Mission folders are abbreviated as labels such as `M/Platform`.",
    "Unknown persisted filters fall back to `All`.",
    "Changing the toolbar filter narrows visible rows without mutating notes.",
  ],
  screenshots: [
    {
      slug: "filtered-board",
      title: "Filtered board",
      alt: "Open board filtered to the M/Platform context",
    },
  ],
});
