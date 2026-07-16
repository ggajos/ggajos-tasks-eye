import { note, violationFixture } from "../fixtures";
import { defineFeature } from "../types";

export default defineFeature({
  title: "Note in managed root",
  summary:
    "A note directly inside the managed root is treated as unprocessed and reported in Inbox until it is moved into a context folder.",
  acceptanceCriteria: [
    "Notes directly inside the configured managed root are reported in Inbox.",
    "The violation text is `note is unprocessed in the managed root folder`.",
    "Notes inside descendant folders do not trigger this violation.",
    "An open root note remains visible in Open while it awaits processing.",
  ],
  violation: {
    code: "note-in-managed-root",
    appearsInOpen: true,
    fixture: violationFixture(note("Unprocessed Architecture Decision.md", {
      status: "open",
      tasks: [{
        text: "Route this decision into its owning architecture context",
        due: "2026-07-08",
      }],
    })),
  },
  screenshots: [
    {
      slug: "violation",
      title: "Unprocessed root note",
      alt: "Inbox row reporting an architecture decision left in the managed root",
    },
    {
      slug: "open",
      title: "Root note in Open",
      alt: "Open row showing an unprocessed architecture decision from the managed root",
    },
  ],
});
