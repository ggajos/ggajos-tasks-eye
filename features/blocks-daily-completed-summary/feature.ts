import { defineFeature } from "../types";

export default defineFeature({
  title: "Daily completed summary block",
  summary:
    "Daily notes can embed a completed-task summary with the `ggajos-tasks-eye-daily-completed` Markdown code block.",
  acceptanceCriteria: [
    "The canonical daily-completed code block renders completed tasks for the note date.",
    "Legacy block names remain supported as migration aliases.",
    "The block derives the date from source content or the daily note filename.",
    "The rendered block includes previous and next daily-note navigation links when available.",
  ],
  screenshots: [
    {
      slug: "summary",
      title: "Daily summary",
      alt: "Architecture work log showing completed decision and readiness tasks",
    },
  ],
});
