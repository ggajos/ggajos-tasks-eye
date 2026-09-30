import { defineFeature } from "../types";

export default defineFeature({
  title: "Reopen selected tasks",
  summary:
    "The editor command turns selected completed tasks back into unchecked tasks and removes their Tasks completion dates.",
  acceptanceCriteria: [
    "The command is available only when the current editor selection contains checked task lines.",
    "The command is registered without a default hotkey.",
    "Standard checked task markers become unchecked markers.",
    "Tasks completion dates are removed from reopened task lines.",
    "The command also works when the Tasks API is unavailable: it reopens the selected standard checkboxes and removes their completion dates.",
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
