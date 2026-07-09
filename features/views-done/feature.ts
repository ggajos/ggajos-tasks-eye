import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "views-done",
  title: "Done view",
  summary:
    "The Done view collects completed Tasks items for a selected date and groups them by context and note.",
  userValue:
    "The user can review what was completed on a specific day without searching individual notes.",
  acceptanceCriteria: [
    "Completed tasks are selected by Tasks completion date.",
    "Tasks are grouped by folder-derived context and note name.",
    "The date picker and previous/next/today controls change the reviewed date.",
    "The context filter narrows completed tasks the same way it narrows board rows.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Growth/Completed Example.md",
  ],
  screenshots: [
    {
      slug: "done-view",
      title: "Done view",
      alt: "Done view grouped by context and note",
    },
  ],
} satisfies FeatureDefinition;
