import { defineFeature } from "../types";

export default defineFeature({
  title: "Notes and task conventions",
  summary:
    "Tasks Eye reads status, `up` tree properties, and Obsidian Tasks emoji metadata from ordinary Markdown notes.",
  acceptanceCriteria: [
    'For a tree entirely inside the notes folder, one root declares `up: "-"` and the other notes link to their parents. Existing parents outside the included folders are also supported.',
    "Context follows the `up` tree rather than the note's folder.",
    "Supported note statuses are `open` and `closed`.",
    "Missing or blank status is treated as `open`.",
    "Tasks Eye reads `📅 YYYY-MM-DD` due dates and `✅ YYYY-MM-DD` completion dates. Scheduled and start markers do not control board dates.",
  ],
  screenshots: [
    {
      slug: "managed-note-row",
      title: "Note row",
      alt: "Open board row rendered from a billing platform modernization note",
    },
  ],
});
