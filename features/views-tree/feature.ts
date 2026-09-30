import { defineFeature } from "../types";

export default defineFeature({
  title: "Tree view",
  summary:
    "See the active note’s parents and descendants in a side panel. Read full titles even in a narrow window, and expand branches at your own pace. Hide closed branches while keeping paths to unfinished notes.",
  acceptanceCriteria: [
    "The Tree panel follows the active note and re-anchors as you navigate.",
    "It keeps the path of parents visible, without sibling notes.",
    "A newly opened or re-anchored tree expands its visible descendants, sorted by note name.",
    "The current note is bold, sits at column zero between its ancestors and descendants, and is not a link.",
    "Indentation and subtle guides show each note’s distance from the current one. Wrapped title lines retain that indentation.",
    "Other notes render as native Obsidian markdown links, so link styling plugins apply; clicking one opens it and re-anchors the panel.",
    "Full titles wrap without a line limit, including long unbroken titles in a narrow panel.",
    "A bullet marks the first line of each note. Wrapped continuation lines have no additional bullet and stay aligned under the title.",
    "Hide closed notes is selected by default. It hides descendant notes with status: closed when they have no non-closed descendants.",
    "A closed descendant stays visible if any note below it is not closed, including through other closed notes. The parent path and current note always remain visible.",
    "The closed-note filter keeps its choice during refreshes and navigation while the panel is open, and starts selected when reopened.",
    "A separate chevron on the current note and descendant branches collapses or expands their children. Leaves have no chevron.",
    "Expand all reveals the full subtree. Collapse all leaves only the parents and current note visible.",
    "Expand one level opens each currently visible collapsed branch once; newly revealed branches stay collapsed until the next click.",
    "Expansion choices survive current-note refreshes and reset when switching notes or reopening the view.",
    "Opening a note outside the included folders shows an empty state.",
  ],
  screenshots: [
    {
      slug: "tree-panel",
      title: "Full titles in a narrow Tree panel",
      alt: "Expanded tree with wrapped titles, hierarchy guides, entry bullets, branch chevrons and four header controls",
    },
    {
      slug: "tree-collapsed",
      title: "Collapse all keeps the parent path visible",
      alt: "Collapsed tree showing only the ancestors and the current note",
    },
    {
      slug: "tree-one-level",
      title: "Reveal one level at a time",
      alt: "Tree showing immediate children after clicking Expand one level",
    },
    {
      slug: "tree-mixed",
      title: "Choose which branches to explore",
      alt: "Tree with a deep expanded branch alongside collapsed branches",
    },
    {
      slug: "tree-hide-closed",
      title: "Hide closed branches and keep paths to unfinished notes",
      alt: "Selected Hide closed notes button with closed ancestors and closed branches leading to an open descendant still visible",
    },
    {
      slug: "tree-show-closed",
      title: "Show closed notes when you need the full tree",
      alt: "Deselected Hide closed notes button revealing closed leaves and a fully closed branch alongside unfinished notes",
    },
  ],
});
