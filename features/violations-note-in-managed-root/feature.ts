import { note, violationFixture } from "../fixtures";
import { defineFeature } from "../types";

export default defineFeature({
  title: "Note without a context folder",
  summary:
    "A note directly inside the notes folder root appears in Inbox until it is moved into a context folder.",
  acceptanceCriteria: [
    "Notes directly inside the configured notes folder root are reported in Inbox.",
    "The issue text is `Note needs to be moved into a context folder.`",
    "Notes inside descendant folders do not trigger this issue.",
    "An open root note remains visible in Open while it awaits a context folder.",
  ],
  violation: {
    code: "note-in-managed-root",
    appearsInOpen: true,
    fixture: violationFixture(
      note("Architecture Decision.md", {
        status: "open",
        tasks: [
          {
            text: "Route this decision into its owning architecture context",
            due: "2026-07-08",
          },
        ],
      }),
    ),
  },
  screenshots: [
    {
      slug: "violation",
      title: "Root note without a context",
      alt: "Inbox row showing an architecture decision left in the notes folder root",
    },
    {
      slug: "open",
      title: "Root note in Open",
      alt: "Open row showing an architecture decision from the notes folder root",
    },
  ],
});
