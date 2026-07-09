import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "actions-uncheck-selected-tasks",
  title: "Uncheck selected tasks",
  summary:
    "The editor command turns selected completed task lines back into unchecked tasks and removes Tasks completion dates.",
  userValue:
    "The user can reopen accidentally completed checklist items without manually cleaning Tasks emoji metadata.",
  acceptanceCriteria: [
    "The command is available only when the current editor selection contains checked task lines.",
    "The command has a default `Ctrl+Shift+D` hotkey for mass unchecking selected tasks.",
    "Standard checked task markers become unchecked markers.",
    "Tasks completion dates are removed from reopened task lines.",
    "The command uses the Tasks API when available and falls back to local line rewriting otherwise.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Growth/Completed Toggle.md",
  ],
  screenshots: [
    {
      slug: "before",
      title: "Before",
      alt: "Markdown editor showing selected completed tasks before reopening",
    },
    {
      slug: "after",
      title: "After",
      alt: "Markdown editor showing selected tasks reopened as unchecked",
    },
  ],
} satisfies FeatureDefinition;
