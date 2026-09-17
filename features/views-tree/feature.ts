import { defineFeature } from "../types";

export default defineFeature({
  title: "Tree view",
  summary:
    "The Tree view opens in a side panel and shows where the active note sits in the `up` hierarchy: the spine from the root down to the current note, then the full subtree of notes beneath it, rendered as a nested list of native Obsidian links.",
  acceptanceCriteria: [
    "The Tree panel follows the active note and re-anchors as you navigate.",
    "It renders the ancestor spine from the root down to the current note, without siblings.",
    "It renders the full descendant subtree of the current note, sorted by note name.",
    "The current note sits between its ancestors and its descendants.",
    "Notes render as native Obsidian markdown links, so link styling plugins apply; clicking one opens it and re-anchors the panel.",
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
