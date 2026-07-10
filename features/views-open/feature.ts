import { defineFeature } from "../types";

export default defineFeature({
  title: "Open view",
  summary:
    "Open is the active-work board for `status: open` notes, grouped by due-date buckets and ordered by next action.",
  acceptanceCriteria: [
    "Notes with missing, blank, or explicit `status: open` appear in Open.",
    "Hold notes do not appear in Open.",
    "Rows use the earliest unfinished due task as the next action.",
    "Rows are grouped into No due, Today, Tomorrow, This Month, Next Month, and Future buckets.",
  ],
  screenshots: [
    {
      slug: "board",
      title: "Open board",
      alt: "Open architecture workspace grouped by due-date buckets",
    },
  ],
});
