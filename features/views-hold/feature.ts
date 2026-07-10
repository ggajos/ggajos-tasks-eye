import { defineFeature } from "../types";

export default defineFeature({
  title: "Hold",
  summary:
    "A backlog board for notes with `status: hold`, kept visible without mixing deferred work into the active Open board.",
  acceptanceCriteria: [
    "Notes with `status: hold` appear in the Hold view.",
    "Notes with `status: open` do not appear in the Hold view.",
    "Hold rows can be narrowed by the same folder-derived context filter as other board rows.",
    "The Hold documentation screenshot is captured for every configured documentation theme.",
  ],
  screenshots: [
    {
      slug: "board",
      title: "Backlog board",
      alt: "Hold backlog board showing a Technology Radar evaluation",
    },
  ],
});
