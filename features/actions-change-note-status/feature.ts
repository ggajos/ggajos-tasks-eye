import { defineFeature } from "../types";

export default defineFeature({
  title: "Change note status",
  summary:
    "Four commands move the active Markdown note directly to Open, Hold, Closed, or Archived by updating its frontmatter.",
  acceptanceCriteria: [
    "`Ctrl+Shift+1`, `2`, `3`, and `4` set `open`, `hold`, `closed`, and `archived` respectively.",
    "The commands work in editing and reading views for any active Markdown note, including notes outside the configured notes folder.",
    "A note without frontmatter receives a `status` property, while an existing status is replaced.",
    "Other frontmatter properties, note content, and task checkboxes are preserved.",
    "Invalid YAML is left untouched and produces an error notice.",
    "Setting a note to Closed does not complete its unchecked tasks; existing Inbox validation continues to report that mismatch.",
  ],
  screenshots: [
    {
      slug: "closed-note",
      title: "Set the active note to Closed",
      alt: "Obsidian note showing a project whose status property is closed while an unchecked task remains",
    },
  ],
});
