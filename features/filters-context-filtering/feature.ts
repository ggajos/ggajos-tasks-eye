import { defineFeature } from "../types";

export default defineFeature({
  title: "Filter by context",
  summary:
    "Use the toolbar to show one branch of your note tree in Focus, Open, Inbox, or Done.",
  acceptanceCriteria: [
    "A first-level note is its own context and deeper descendants inherit that context.",
    "Notes can live in unrelated folders without changing their context.",
    "Select the root note’s name to show the whole tree; without a unique indexed root, this option is `*`.",
    "If a saved context no longer exists, the board returns to the whole-tree filter.",
    "Changing the filter only changes what you see; your notes are untouched.",
    "When a context filter hides matching notes, a quiet informational line below the toolbar shows how many notes are hidden.",
    "The hidden count applies only to the current view; Done counts notes for the selected completion date, not individual tasks.",
    "If the filter hides every matching note, the page says there are no matching notes in that context instead of showing an all-clear celebration.",
    "The informational line has no actions and disappears when the filter hides no matching notes.",
  ],
  screenshots: [
    {
      slug: "filtered-board",
      title: "Filtered board",
      alt: "Open board filtered to the Mission context",
    },
    {
      slug: "filtered-focus",
      title: "Hidden notes in Focus",
      alt: "Focus with one note hidden by the Work context filter",
    },
    {
      slug: "filtered-inbox-empty",
      title: "An empty filtered Inbox",
      alt: "Inbox explains that two notes are hidden by the Work filter without an all-clear celebration",
    },
    {
      slug: "filtered-done",
      title: "Hidden notes in Done",
      alt: "Done counts one hidden note even when that note contains multiple completed tasks",
    },
    {
      slug: "filtered-focus-empty",
      title: "An empty filtered Focus",
      alt: "Focus explains that two notes are hidden by the Quiet filter instead of saying today is handled",
    },
  ],
});
