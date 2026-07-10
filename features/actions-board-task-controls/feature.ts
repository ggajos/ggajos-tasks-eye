import { defineFeature } from "../types";

export default defineFeature({
  title: "Board task controls",
  summary:
    "Board rows expose task actions for completing the next task and shifting due dates without opening the note.",
  acceptanceCriteria: [
    "Rows with an unfinished task show a complete button.",
    "Rows with a due date show `+1`, `-1`, `+7`, and `-7` due-date controls.",
    "Shifting a due date updates the matching Tasks due marker in the note.",
    "Completing a task delegates to the Obsidian Tasks API and refreshes the board.",
  ],
  screenshots: [
    {
      slug: "controls",
      title: "Row controls",
      alt: "Billing platform architecture action with complete and due-date shift controls",
    },
  ],
});
