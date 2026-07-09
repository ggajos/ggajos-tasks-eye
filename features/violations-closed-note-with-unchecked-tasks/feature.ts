import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "violations-closed-note-with-unchecked-tasks",
  title: "Violation: closed note has unchecked tasks",
  summary:
    "A note with `status: closed` is invalid when it still contains unchecked task lines.",
  userValue:
    "The user is warned when a supposedly finished note still contains unresolved work.",
  acceptanceCriteria: [
    "`status: closed` notes with unchecked tasks are reported in Inbox.",
    "Closed notes with only completed tasks do not trigger this violation.",
    "The violation text is `closed note has unchecked tasks`.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Growth/Closed With Open Task.md",
  ],
  screenshots: [
    {
      slug: "violation",
      title: "Closed note violation",
      alt: "Inbox row showing a closed note with unchecked tasks violation",
    },
  ],
} satisfies FeatureDefinition;
