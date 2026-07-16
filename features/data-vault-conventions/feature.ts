import { defineFeature } from "../types";

export default defineFeature({
  title: "Notes and task conventions",
  summary:
    "Tasks Eye reads Markdown notes recursively from a configured vault folder, plus status frontmatter and Obsidian Tasks emoji metadata.",
  acceptanceCriteria: [
    "The notes folder is configurable and defaults to the vault root (`/`).",
    "Tasks Eye reads Markdown notes directly inside the configured folder and all descendants.",
    "A missing configured folder produces an explicit configuration error.",
    "Supported note statuses are `open`, `hold`, `closed`, and `archived`.",
    "Missing or blank status is treated as `open`.",
    "Tasks due dates and completion dates are read from Obsidian Tasks emoji metadata.",
  ],
  screenshots: [
    {
      slug: "managed-note-row",
      title: "Note row",
      alt: "Open board row rendered from a billing platform modernization note",
    },
  ],
});
