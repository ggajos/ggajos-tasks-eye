import { note, violationFixture } from "../fixtures";
import { defineFeature } from "../types";

export default defineFeature({
  title: "Repair tree structure",
  summary:
    "Inbox reports loops and duplicate roots so the explicit note tree stays resolvable.",
  acceptanceCriteria: [
    "Every note in an `up` loop reports `up` links form a loop.",
    "Every note declaring `up: -` reports the duplicate-root message when more than one root exists.",
    "A unique root remains a normal note with the usual task and status validations.",
    "Broken structure does not crash context resolution for other branches.",
  ],
  violation: {
    code: "up-cycle",
    appearsInOpen: true,
    fixture: violationFixture(
      note("A.md", {
        status: "open",
        up: "[[A]]",
        tasks: [{ text: "Break the loop", due: "2026-07-08" }],
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
      title: "Tree loop",
      alt: "Inbox row explaining that the note up links form a loop",
    },
    {
      slug: "open",
      title: "Looping note in Open",
      alt: "Open row showing a note with a looping up link",
    },
  ],
});
