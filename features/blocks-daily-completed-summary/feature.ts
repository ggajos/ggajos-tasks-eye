import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "blocks-daily-completed-summary",
  title: "Daily completed summary block",
  summary:
    "Daily notes can embed a completed-task summary with the `ggajos-tasks-eye-daily-completed` Markdown code block.",
  userValue:
    "The user can review completed work inside the daily note where planning and reflection already happen.",
  acceptanceCriteria: [
    "The canonical daily-completed code block renders completed tasks for the note date.",
    "Legacy block names remain supported as migration aliases.",
    "The block derives the date from source content or the daily note filename.",
    "The rendered block includes previous and next daily-note navigation links when available.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Timeline/2026/2026-07-08 - Wed.md",
    "acceptance/fixtures/base/Db/Growth/Completed Example.md",
  ],
  screenshots: [
    {
      slug: "summary",
      title: "Daily summary",
      alt: "Daily note preview showing a completed task summary block",
    },
  ],
} satisfies FeatureDefinition;
