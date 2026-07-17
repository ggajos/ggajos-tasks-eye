import { defineFeature } from "../types";

export default defineFeature({
  title: "Step note status",
  summary:
    "Two commands step the active Markdown note along the status chain " +
    "none → open → hold → closed → archived by updating its frontmatter.",
  acceptanceCriteria: [
    "`Ctrl+Shift+2` moves the note one step forward and `Ctrl+Shift+1` one " +
      "step back along `none → open → hold → closed → archived`.",
    "Stepping back from `open` removes the `status` property entirely; " +
      "stepping forward from no status sets `open`.",
    "The ends clamp: forward from `archived` and back from no status do " +
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
      title: "Step the active note forward to Hold",
      alt:
        "Obsidian note showing a project whose status property is hold " +
        "after stepping forward from open",
    },
  ],
});
