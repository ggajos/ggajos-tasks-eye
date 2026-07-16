import { note, violationFixture } from "../fixtures";
import { defineFeature } from "../types";

export default defineFeature({
  title: "Unsupported status",
  summary:
    "A note needs `open`, `hold`, `closed`, or `archived` when it declares a status.",
  acceptanceCriteria: [
    "Explicit unsupported status values are reported in Inbox.",
    "Non-string status values are reported in Inbox.",
    "Missing or blank status does not trigger this issue because it defaults to Open.",
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
