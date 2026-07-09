import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "data-vault-conventions",
  title: "Vault conventions",
  summary:
    "Tasks Eye reads managed Markdown notes from `Db/`, timeline notes from `Timeline/`, status frontmatter, and Obsidian Tasks emoji metadata.",
  userValue:
    "The user keeps a readable vault where the plugin adds views without owning the underlying data format.",
  acceptanceCriteria: [
    "Managed work notes live under `Db/`.",
    "Daily notes live under `Timeline/` and expose dates through their filenames.",
    "Supported note statuses are `open`, `hold`, `closed`, and `archived`.",
    "Missing or blank status is treated as `open`.",
    "Tasks due dates and completion dates are read from Obsidian Tasks emoji metadata.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Mission/Allegro/Invoice Sync.md",
    "acceptance/fixtures/base/Timeline/2026/2026-07-08 - Wed.md",
  ],
  screenshots: [
    {
      slug: "managed-note-row",
      title: "Managed note row",
      alt: "Open board row rendered from a managed Markdown note",
    },
  ],
} satisfies FeatureDefinition;
