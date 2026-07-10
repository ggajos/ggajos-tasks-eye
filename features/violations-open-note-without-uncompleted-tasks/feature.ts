import { defineFeature } from "../types";

export default defineFeature({
  title: "Open note without an unchecked task",
  summary:
    "An open note is invalid when it has no unchecked task left to act on.",
  acceptanceCriteria: [
    "`status: open` notes with no unchecked tasks are reported in Inbox.",
    "Missing or blank status is treated as Open for this rule.",
    "Open notes with at least one unchecked task do not trigger this violation.",
    "The violation is visible in both Inbox and Open.",
  ],
  violation: {
    code: "open-without-uncompleted-tasks",
    appearsInOpen: true,
    sampleNote: {
      path: "Db/Case Studies/Engineering Strategy Q3.md",
      markdown: `---
status: open
---

# Engineering Strategy Q3

The strategy covers platform leverage and reliability investment, but still
needs a concrete next action.
`,
    },
  },
  screenshots: [
    {
      slug: "violation",
      title: "Strategy without a next action",
      alt: "Inbox row showing an engineering strategy note without an unchecked next action",
    },
    {
      slug: "open",
      title: "Strategy gap in Open",
      alt: "Open row showing an engineering strategy note that needs a next action",
    },
  ],
});
