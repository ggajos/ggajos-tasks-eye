import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "availability-vacation-markers",
  title: "Vacation availability markers",
  summary:
    "Open boards show configured weekends, holidays, and custom OOO dates as availability markers through the work timeline.",
  userValue:
    "The user can see unavailable dates next to scheduled work and isolate those dates with the synthetic `OOO` filter.",
  acceptanceCriteria: [
    "Configured weekends, annual holidays, movable holidays, and custom dates are recognized as unavailable.",
    "Open boards interleave vacation markers with dated work.",
    "The `OOO` filter shows only availability markers.",
    "Normal context filters suppress availability markers.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Life/Vacation Collision.md",
  ],
  screenshots: [
    {
      slug: "ooo-filter",
      title: "OOO filter",
      alt: "Open board filtered to vacation availability markers",
    },
  ],
} satisfies FeatureDefinition;
