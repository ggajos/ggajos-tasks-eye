import { defineFeature } from "../types";

export default defineFeature({
  title: "Vault conventions",
  summary:
    "Tasks Eye reads managed Markdown notes from `Db/`, timeline notes from `Timeline/`, status frontmatter, and Obsidian Tasks emoji metadata.",
  acceptanceCriteria: [
    "Managed work notes live under `Db/`.",
    "Daily notes live under `Timeline/` and expose dates through their filenames.",
    "Supported note statuses are `open`, `hold`, `closed`, and `archived`.",
    "Missing or blank status is treated as `open`.",
    "Tasks due dates and completion dates are read from Obsidian Tasks emoji metadata.",
  ],
  screenshots: [
    {
      slug: "managed-note-row",
      title: "Managed note row",
      alt: "Open board row rendered from a billing platform modernization note",
    },
  ],
});
