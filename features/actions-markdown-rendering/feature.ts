import { defineFeature } from "../types";

export default defineFeature({
  title: "Markdown in board tasks",
  summary:
    "Task text keeps its links, emphasis, and inline code when shown on the board.",
  acceptanceCriteria: [
    "Internal links render as Obsidian links instead of raw wiki-link syntax.",
    "Emphasis and inline code retain their native Markdown presentation.",
    "Links point to the same notes they would from the original task.",
    "The rendered action continues to expose its normal task controls.",
  ],
  screenshots: [
    {
      slug: "formatted-action",
      title: "Markdown-formatted architecture task",
      alt: "Architecture task in Open with an internal link, bold emphasis, and inline code",
    },
  ],
});
