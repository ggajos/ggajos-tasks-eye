import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "views-inbox",
  title: "Inbox view",
  summary:
    "Inbox is the repair queue that collects notes with validation violations, regardless of their current status.",
  userValue:
    "The user gets one place to fix broken or inconsistent work notes before they pollute daily planning.",
  acceptanceCriteria: [
    "Inbox shows notes with validation errors.",
    "Inbox includes invalid notes regardless of whether their status is open, hold, or closed.",
    "Inbox rows show the same note links, context badges, and row actions as other task rows.",
    "Inbox displays an all-clear empty state when no files violate the rules.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Growth/Missing Task.md",
    "acceptance/fixtures/base/Db/Growth/Invalid Status.md",
    "acceptance/fixtures/base/Db/Growth/Closed With Open Task.md",
    "acceptance/fixtures/base/Db/Life/Vacation Collision.md",
  ],
  screenshots: [
    {
      slug: "repair-queue",
      title: "Repair queue",
      alt: "Inbox repair queue showing validation errors",
    },
  ],
} satisfies FeatureDefinition;
