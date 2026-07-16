import { defineFeature } from "../types";

export default defineFeature({
  title: "Open view",
  summary:
    "Open turns active notes into a dated view of their next actions, so you can see what needs attention now without losing the surrounding note context.",
  acceptanceCriteria: [
    "Notes with missing, blank, or explicit `status: open` appear in Open.",
    "Hold notes do not appear in Open.",
    "Rows use the earliest unchecked due task as the next action.",
    "Rows are grouped into No Due Date, Today, Tomorrow, This Month, Next Month, and Future buckets.",
    "A new Open pane starts with Today expanded and every other due-date bucket collapsed.",
    "Manual bucket choices survive rerenders and tab switches until the pane is closed.",
  ],
  screenshots: [
    {
      slug: "board",
      title: "A lived-in Open board",
      alt: "Mature Open board with realistic notes across several expanded due-date sections",
    },
  ],
});
