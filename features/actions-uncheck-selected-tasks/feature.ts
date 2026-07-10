import { defineFeature } from "../types";

export default defineFeature({
  title: "Uncheck selected tasks",
  summary:
    "The editor command turns selected completed task lines back into unchecked tasks and removes Tasks completion dates.",
  acceptanceCriteria: [
    "The command is available only when the current editor selection contains checked task lines.",
    "The command has a default `Ctrl+Shift+D` hotkey for mass unchecking selected tasks.",
    "Standard checked task markers become unchecked markers.",
    "Tasks completion dates are removed from reopened task lines.",
    "The command uses the Tasks API when available and falls back to local line rewriting otherwise.",
  ],
  screenshots: [
    {
      slug: "before",
      title: "Before",
      alt: "Release readiness note with completed engineering checks selected for reopening",
    },
    {
      slug: "after",
      title: "After",
      alt: "Release readiness note with engineering checks reopened as unchecked",
    },
  ],
});
