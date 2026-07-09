import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "actions-board-task-controls",
  title: "Board task controls",
  summary:
    "Board rows expose task actions for completing the next task and shifting due dates without opening the note.",
  userValue:
    "The user can triage work directly from the board while Tasks Eye keeps the underlying Markdown task line as the source of truth.",
  acceptanceCriteria: [
    "Rows with an unfinished task show a complete button.",
    "Rows with a due date show `+1`, `-1`, `+7`, and `-7` due-date controls.",
    "Shifting a due date updates the matching Tasks due marker in the note.",
    "Completing a task delegates to the Obsidian Tasks API and refreshes the board.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Mission/Allegro/Invoice Sync.md",
  ],
  screenshots: [
    {
      slug: "controls",
      title: "Row controls",
      alt: "Open board row showing complete and due-date shift controls",
    },
  ],
} satisfies FeatureDefinition;
