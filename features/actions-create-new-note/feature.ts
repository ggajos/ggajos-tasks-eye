import { defineFeature } from "../types";

export default defineFeature({
  title: "Create a Tasks Eye note",
  summary:
    "The creation command asks only for a managed folder, generates an Untitled filename, and opens the initialized note for editing.",
  acceptanceCriteria: [
    "The command has a default `Ctrl+Shift+N` hotkey on every platform.",
    "The folder picker offers the managed folder root and its descendants, but nothing outside the configured folder.",
    "The managed root is the default folder choice.",
    "Selecting a folder immediately creates `Untitled.md`; collisions receive numeric suffixes such as `Untitled 1.md`.",
    "The created note starts with `status: open` frontmatter.",
    "The new note opens immediately in Obsidian for editing.",
    "A note created in the managed root appears in Inbox with the managed-root violation.",
  ],
  screenshots: [
    {
      slug: "folder-picker",
      title: "Choose a managed folder",
      alt: "Tasks Eye folder picker with the managed root selected by default above its folders",
    },
  ],
});
