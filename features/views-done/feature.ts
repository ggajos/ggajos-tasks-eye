import { defineFeature } from "../types";

export default defineFeature({
  title: "Done view",
  summary:
    "Done collects tasks completed on a selected date and groups them by context and note.",
  acceptanceCriteria: [
    "Done is the fourth view in Tasks Eye navigation.",
    "Completed tasks are selected by Tasks completion date.",
    "Tasks are grouped by folder-derived context and note name.",
    "The date picker and previous/next/today controls change the reviewed date.",
    "The context filter narrows completed tasks the same way it narrows board rows.",
  ],
  screenshots: [
    {
      slug: "done-view",
      title: "Done view",
      alt: "Tasks Eye Done view showing completed architecture decisions grouped by context and note",
    },
  ],
});
