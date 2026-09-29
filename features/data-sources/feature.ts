import { defineFeature } from "../types";

export default defineFeature({
  title: "Sources",
  summary:
    "Choose which vault folders Tasks Eye reads: one notes folder plus optional excluded subfolders.",
  acceptanceCriteria: [
    "The notes folder is configurable in the Sources settings section and defaults to the vault root (`/`).",
    "Tasks Eye reads Markdown notes directly inside the notes folder and all descendants.",
    "A missing notes folder produces an explicit configuration error.",
    "Any number of excluded folders can be added and removed in settings.",
    "Notes inside an excluded folder or any of its subfolders are not indexed, validated, or shown.",
    "A note whose `up` parent is excluded is treated like a note whose parent is outside the notes folder: the parent acts as an external tree root.",
    "Exclusion matches whole folder names: excluding `Archive` keeps `Archive 2026`.",
    "Excluding subfolders works with the vault root as the notes folder.",
    "An exclusion outside the notes folder is accepted and has no effect.",
    "An exclusion that equals or contains the notes folder is rejected, and so is moving the notes folder inside an excluded folder.",
    "An excluded folder that no longer exists shows a non-blocking warning.",
    "Boards refresh when exclusions change or notes move into or out of an excluded folder.",
  ],
  screenshots: [
    {
      slug: "sources-settings",
      title: "Sources settings",
      alt: "Sources settings section with the notes folder and an excluded Archive folder",
    },
  ],
});
