import type { FeatureDefinition } from "../types";

export const feature = {
  slug: "views-hold",
  title: "Hold",
  summary:
    "A backlog board for notes with `status: hold`, kept visible without mixing deferred work into the active Open board.",
  userValue:
    "The user can keep future or paused work findable, reviewable, and filterable while preserving a clean active-work queue.",
  acceptanceCriteria: [
    "Notes with `status: hold` appear in the Hold view.",
    "Notes with `status: open` do not appear in the Hold view.",
    "Hold rows can be narrowed by the same folder-derived context filter as other board rows.",
    "The Hold documentation screenshot is captured for every configured documentation theme.",
  ],
  fixturePaths: [
    "acceptance/fixtures/base/Db/Growth/Reading Queue.md",
  ],
  screenshots: [
    {
      slug: "board",
      title: "Backlog board",
      alt: "Hold backlog board showing a Reading Queue note",
    },
  ],
} satisfies FeatureDefinition;
