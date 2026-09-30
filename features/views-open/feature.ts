import { defineFeature } from "../types";

export default defineFeature({
  title: "Open view",
  summary:
    "Open turns active notes into a dated view of their next actions, so you can see what needs attention now without losing the surrounding note context.",
  acceptanceCriteria: [
    "Notes with missing, blank, or explicit `status: open` appear in Open.",
    "Closed notes and notes with unsupported statuses do not appear in Open.",
    "Each row shows the unchecked task with the earliest due date. If none are dated, it shows the first unchecked task.",
    "Rows use the first matching Overdue, No Due Date, Today, Tomorrow, This Week, Next Week, This Month, Next Month, or Future bucket.",
    "Weeks run Monday through Sunday and take precedence over overlapping month buckets.",
    "A new Open pane starts with Today expanded and every other due-date bucket collapsed.",
    "Sections you expand or collapse keep that state across updates and tab switches until you close the pane.",
  ],
  screenshots: [
    {
      slug: "board",
      title: "A lived-in Open board",
      alt: "Mature Open board with realistic notes across several expanded due-date sections",
    },
  ],
});
