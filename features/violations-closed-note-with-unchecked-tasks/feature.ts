import { defineFeature } from "../types";

export default defineFeature({
  title: "Closed note with unchecked tasks",
  summary:
    "A note with `status: closed` is invalid when it still contains unchecked task lines.",
  acceptanceCriteria: [
    "`status: closed` notes with unchecked tasks are reported in Inbox.",
    "Closed notes with only completed tasks do not trigger this violation.",
    "The violation text is `closed note has unchecked tasks`.",
  ],
  violation: {
    code: "closed-with-unchecked-tasks",
    appearsInOpen: false,
    sampleNote: {
      path: "Db/Case Studies/ADR-042 Tenant Isolation.md",
      markdown: `---
status: closed
---

# ADR-042: Tenant Isolation

- [ ] Publish tenant migration guardrails for service owners
`,
    },
  },
  screenshots: [
    {
      slug: "violation",
      title: "Closed ADR with an open follow-up",
      alt: "Inbox row showing a closed tenant-isolation ADR with an unchecked rollout follow-up",
    },
  ],
});
