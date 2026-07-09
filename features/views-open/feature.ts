import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "views-open",
  title: "Open view",
  summary:
    "Open is the active-work board for `status: open` notes, grouped by due-date buckets and ordered by next action.",
  userValue:
    "The user can see actionable work by urgency while keeping future scheduling in normal Tasks due dates.",
  acceptanceCriteria: [
    "Notes with missing, blank, or explicit `status: open` appear in Open.",
    "Hold notes do not appear in Open.",
    "Rows use the earliest unfinished due task as the next action.",
    "Rows are grouped into No due, Today, Tomorrow, This Month, Next Month, and Future buckets.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Mission/Allegro/Invoice Sync.md",
    "acceptance/fixtures/base/Db/Life/Passport Renewal.md",
  ],
  screenshots: [
    {
      slug: "board",
      title: "Open board",
      alt: "Open board grouped by due-date buckets",
    },
  ],
} satisfies FeatureDefinition;
