import { defineFeature } from "../types";

export default defineFeature({
  title: "Markdown in board tasks",
  summary:
    "Board actions use Obsidian's Markdown renderer so links and inline formatting remain meaningful outside the source note.",
  acceptanceCriteria: [
    "Internal links render as Obsidian links instead of raw wiki-link syntax.",
    "Emphasis and inline code retain their native Markdown presentation.",
    "Link resolution uses the task's source note as its Markdown context.",
    "The rendered action continues to expose its normal task controls.",
  ],
  screenshots: [
    {
      slug: "formatted-action",
      title: "Markdown-formatted architecture task",
      alt: "Architecture task in Hold with an internal link, bold emphasis, and inline code",
    },
  ],
});
