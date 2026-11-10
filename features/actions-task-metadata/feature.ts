import { defineFeature } from "../types";

export default defineFeature({
  title: "Muted task configuration",
  summary:
    "Keep task descriptions prominent while configuration stays visible but muted in every view.",
  acceptanceCriteria: [
    "Text from the first emoji onward is muted, including priority, recurrence, completion rules, dates, and task identifiers.",
    "Configuration text uses the same faint color as day labels.",
    "Configuration emojis are grayscale and dimmed alongside their values.",
    "Tags and visible trailing block IDs are muted even without an emoji.",
    "Done keeps the original task text, including its completion date, rather than removing configuration.",
    "Markdown formatting, links, task controls, and source notes are preserved.",
    "Dataview-style configuration fields are not recognized for dimming.",
  ],
  screenshots: [
    {
      slug: "metadata-focus",
      title: "Muted configuration in Focus",
      alt: "Focus tasks with prominent descriptions and muted priority, recurrence and date metadata",
    },
    {
      slug: "metadata-open",
      title: "Muted configuration in Open",
      alt: "Open tasks retaining native links and formatting while configuration is muted",
    },
    {
      slug: "metadata-inbox",
      title: "Muted configuration in Inbox",
      alt: "An Inbox task with a muted tag and block ID alongside its validation message",
    },
    {
      slug: "metadata-done",
      title: "Muted configuration in Done",
      alt: "Done tasks with their original priority, tags and completion dates visible but muted",
    },
  ],
});
