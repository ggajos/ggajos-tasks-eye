import { note, violationFixture } from "../fixtures";
import { defineFeature } from "../types";

export default defineFeature({
  title: "Invalid status",
  summary:
    "A note with explicit status outside `open`, `hold`, `closed`, or `archived` is invalid.",
  acceptanceCriteria: [
    "Explicit unsupported status values are reported in Inbox.",
    "Non-string status values are reported in Inbox.",
    "Missing or blank status does not trigger this violation because it defaults to Open.",
  ],
  violation: {
    code: "invalid-status",
    appearsInOpen: false,
    fixture: violationFixture(note(
      "Case Studies/Service Ownership Model.md",
      `---
status: reviewing
---

# Service Ownership Model

- [ ] Align escalation boundaries with platform and product leadership
`,
    )),
  },
  screenshots: [
    {
      slug: "violation",
      title: "Unsupported workflow status",
      alt: "Inbox row showing a service ownership proposal with an unsupported reviewing status",
    },
  ],
});
