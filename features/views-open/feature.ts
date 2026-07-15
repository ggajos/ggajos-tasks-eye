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
    "A new Open pane starts with Today expanded and every other due-date bucket collapsed.",
    "Manual bucket choices survive rerenders and tab switches until the pane is closed.",
  ],
  screenshots: [
    {
      slug: "board",
      title: "Open board",
      alt: "Open architecture workspace grouped by due-date buckets",
    },
  ],
});
