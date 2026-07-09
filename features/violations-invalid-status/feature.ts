import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "violations-invalid-status",
  title: "Violation: invalid status",
  summary:
    "A note with explicit status outside `open`, `hold`, `closed`, or `archived` is invalid.",
  userValue:
    "The user gets an immediate repair cue when a typo or obsolete status would otherwise hide a note from the intended workflow.",
  acceptanceCriteria: [
    "Explicit unsupported status values are reported in Inbox.",
    "Non-string status values are reported in Inbox.",
    "Missing or blank status does not trigger this violation because it defaults to Open.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Growth/Invalid Status.md",
  ],
  screenshots: [
    {
      slug: "violation",
      title: "Invalid status violation",
      alt: "Inbox row showing an invalid status violation",
    },
  ],
} satisfies FeatureDefinition;
