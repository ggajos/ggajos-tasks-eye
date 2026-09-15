import { note, violationFixture } from "../fixtures";
import { defineFeature } from "../types";

export default defineFeature({
  title: "Repair missing parent links",
  summary:
    "Inbox identifies notes that do not declare a valid `up` link to another indexed note.",
  acceptanceCriteria: [
    "A note without an `up` property reports `Note needs an `up` link to its parent.`.",
    "A note whose `up` link does not resolve reports `up` link points to a note that doesn't exist.",
    "A valid root declares `up: -` and is not reported as missing its parent.",
    "Broken parent links do not prevent otherwise valid notes from appearing in Open.",
  ],
  violation: {
    code: "note-without-up",
    appearsInOpen: true,
    fixture: violationFixture(
      note("Captured.md", {
        status: "open",
        tasks: [
          {
            text: "Route this capture to its parent note",
            due: "2026-07-08",
          },
        ],
      }),
      [
        note("Root.md", {
          status: "closed",
          up: "-",
          tasks: [{ text: "Reviewed the tree", completed: "2026-07-08" }],
        }),
      ],
    ),
  },
  screenshots: [
    {
      slug: "violation",
      title: "Note without an up link",
      alt: "Inbox row explaining that a captured note needs an up link to its parent",
    },
    {
      slug: "open",
      title: "Broken note in Open",
      alt: "Open row showing a captured note that still needs an up link",
    },
  ],
});
