import { defineFeature } from "../types";

export default defineFeature({
  title: "Create a note",
  summary:
    "The creation command chooses a location in the notes folder, creates an open Untitled note, and opens it for editing.",
  acceptanceCriteria: [
    "The command has a default `Ctrl+Shift+N` hotkey on every platform.",
    "The folder picker offers the notes folder root and its descendants, but nothing outside the configured folder.",
    "The notes folder root is the default choice.",
    "Selecting a folder immediately creates `Untitled.md`; collisions receive numeric suffixes such as `Untitled 1.md`.",
    "The created note starts with `status: open` frontmatter.",
    "The new note opens immediately in Obsidian for editing.",
    "A note created in the notes folder root appears in Inbox until it is moved into a context folder.",
  ],
  screenshots: [
    {
      slug: "folder-picker",
      title: "Choose a notes folder location",
      alt: "Tasks Eye folder picker with the notes folder root above its context folders",
    },
  ],
});
