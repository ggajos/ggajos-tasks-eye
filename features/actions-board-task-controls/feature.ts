import { defineFeature } from "../types";

export default defineFeature({
  title: "Complete, reschedule, and reprioritize tasks",
  summary:
    "Board rows can mark the next task done, move its due date, or nudge its priority without opening the note.",
  acceptanceCriteria: [
    "Rows with an unchecked task show a mark-done button.",
    "Rows with a due date show `-1` and `+1` due-date controls in that order.",
    "Rows with an unchecked task show raise (`↑`) and lower (`↓`) priority controls.",
    "The raise button is disabled when the task is already at the highest priority, and the lower button is disabled when the task is already at the lowest priority.",
    "Moving a due date updates the matching Tasks due marker in the note.",
    "Raising or lowering priority updates the matching Tasks priority signifier in the note.",
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
