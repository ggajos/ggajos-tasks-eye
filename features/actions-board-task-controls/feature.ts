import { defineFeature } from "../types";

export default defineFeature({
  title: "Complete and reschedule tasks",
  summary:
    "Board rows can mark the next task done or move its due date without opening the note.",
  acceptanceCriteria: [
    "Rows with an unchecked task show a mark-done button.",
    "Rows with a due date show `+1`, `-1`, `+7`, and `-7` due-date controls.",
    "Moving a due date updates the matching Tasks due marker in the note.",
    "Marking a task done delegates to the Tasks API and refreshes the board.",
  ],
  screenshots: [
    {
      slug: "controls",
      title: "Act on the next task",
      alt: "Open board with realistic Today tasks and controls for completing or rescheduling one task",
    },
  ],
});
