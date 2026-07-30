import { defineFeature } from "../types";

export default defineFeature({
  title: "Step note status",
  summary:
    "Two commands step the active Markdown note along the status chain " +
    "none → open → closed by updating its frontmatter.",
  acceptanceCriteria: [
    "The previous and next status commands are registered without default hotkeys.",
    "The next command moves the note one step forward and the previous command " +
      "moves it one step back along `none → open → closed`.",
    "Stepping back from `open` removes the `status` property entirely; " +
      "stepping forward from no status sets `open`.",
    "The ends clamp: forward from `closed` and back from no status do " +
      "nothing.",
    "An unsupported status value is repaired: forward sets `open` and back " +
      "removes the property.",
    "The commands work in editing and reading views for any active Markdown " +
      "note, including notes outside the configured notes folder.",
    "Other frontmatter properties, note content, and task checkboxes are " +
      "preserved.",
    "Invalid YAML is left untouched and produces an error notice.",
  ],
  screenshots: [
    {
      slug: "stepped-note",
      title: "Step the active note forward to Closed",
      alt:
        "Obsidian note showing a project whose status property is closed " +
        "after stepping forward from open",
    },
  ],
});
