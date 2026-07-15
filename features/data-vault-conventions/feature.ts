import { defineFeature } from "../types";

export default defineFeature({
  title: "Vault conventions",
  summary:
    "Tasks Eye reads Markdown notes recursively from a configured vault folder, plus status frontmatter and Obsidian Tasks emoji metadata.",
  acceptanceCriteria: [
    "The managed notes folder is configurable and defaults to the vault root (`/`).",
    "Markdown notes directly inside the configured folder and all descendants are managed.",
    "A missing configured folder produces an explicit configuration error.",
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
