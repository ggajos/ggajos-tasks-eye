import { defineFeature } from "../types";

export default defineFeature({
  title: "Tree view",
  summary:
    "Open Tree in a side panel to see the active note’s parents and descendants. Dots show how far each note is from the current one.",
  acceptanceCriteria: [
    "The Tree panel follows the active note and re-anchors as you navigate.",
    "It shows the path of parents down to the current note, without sibling notes.",
    "It renders the full descendant subtree of the current note, sorted by note name.",
    "The current note is bold, sits at column zero between its ancestors and descendants, and is not a link.",
    "Ancestors and descendants use matching dot prefixes to show their distance from the current note.",
    "Other notes render as native Obsidian markdown links, so link styling plugins apply; clicking one opens it and re-anchors the panel.",
    "Long tree links stay on one line, truncate with an ellipsis, and expose their full label in a tooltip.",
    "Opening a note outside the included folders shows an empty state.",
  ],
  screenshots: [
    {
      slug: "tree-panel",
      title: "The Tree side panel",
      alt: "Tree panel showing the root-to-current spine and the descendant subtree of the active note",
    },
  ],
});
