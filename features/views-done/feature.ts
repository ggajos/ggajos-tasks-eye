import { defineFeature } from "../types";

export default defineFeature({
  title: "Done view",
  summary:
    "Done shows the day's completed tasks alongside unfinished tasks with due dates, preserving subtask nesting and grouping by context and note.",
  acceptanceCriteria: [
    "Done is the fifth view in Tasks Eye navigation.",
    "Completed tasks are selected by Tasks completion date.",
    "An 'Unfinished' toggle adds every unfinished task with a due date, but only inside notes that also have a task completed on the selected day.",
    "Subtask nesting is preserved; ancestors of a matching task appear as muted context rows without a completion check.",
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
    {
      slug: "done-future-nesting",
      title: "Done with unfinished tasks and nesting",
      alt: "Tasks Eye Done view with Show Unfinished enabled, showing completed and unfinished due-dated tasks nested under their parent tasks",
    },
  ],
});
