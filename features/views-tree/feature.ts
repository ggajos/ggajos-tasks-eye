import { defineFeature } from "../types";

export default defineFeature({
  title: "Tree view",
  summary:
    "The Tree view opens in a side panel and shows where the active note sits in the `up` hierarchy: the spine from the root down to the current note, then the full subtree of notes beneath it, with dot prefixes that show distance from the current note.",
  acceptanceCriteria: [
    "The Tree panel follows the active note and re-anchors as you navigate.",
    "It renders the ancestor spine from the root down to the current note, without siblings.",
    "It renders the full descendant subtree of the current note, sorted by note name.",
    "The current note is bold, sits at column zero between its ancestors and descendants, and is not a link.",
    "Ancestors and descendants use matching dot prefixes to show their distance from the current note.",
    "Other notes render as native Obsidian markdown links, so link styling plugins apply; clicking one opens it and re-anchors the panel.",
    "Opening a note that is not indexed shows a gentle empty state.",
  ],
  screenshots: [
    {
      slug: "tree-panel",
      title: "The Tree side panel",
      alt: "Tree panel showing the root-to-current spine and the descendant subtree of the active note",
    },
  ],
});
