import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "filters-context-filtering",
  title: "Context filtering",
  summary:
    "Tasks Eye derives context labels from `Db/` folders and uses the toolbar filter to narrow board and Done views.",
  userValue:
    "The user can focus on one area of life or work without changing note metadata or moving tasks between queues.",
  acceptanceCriteria: [
    "Folder paths below `Db/` produce stable context keys and display labels.",
    "Nested Mission folders are abbreviated as labels such as `M/Allegro`.",
    "Unknown persisted filters fall back to `All`.",
    "Changing the toolbar filter narrows visible rows without mutating notes.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Mission/Allegro/Invoice Sync.md",
    "acceptance/fixtures/base/Db/Life/Passport Renewal.md",
  ],
  screenshots: [
    {
      slug: "filtered-board",
      title: "Filtered board",
      alt: "Open board filtered to the M/Allegro context",
    },
  ],
} satisfies FeatureDefinition;
