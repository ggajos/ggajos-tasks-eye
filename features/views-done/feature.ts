import { defineFeature } from "../types";

export default defineFeature({
  title: "Done mode",
  summary:
    "The unified Tasks Eye view includes a Done mode that collects completed Tasks items for a selected date and groups them by context and note.",
  acceptanceCriteria: [
    "Done is the fourth mode in the single Tasks Eye native view.",
    "Completed tasks are selected by Tasks completion date.",
    "Tasks are grouped by folder-derived context and note name.",
    "The date picker and previous/next/today controls change the reviewed date.",
    "The context filter narrows completed tasks the same way it narrows board rows.",
  ],
  screenshots: [
    {
      slug: "done-view",
      title: "Done mode",
      alt: "Unified Tasks Eye view in Done mode showing completed architecture decisions grouped by context and note",
    },
  ],
});
