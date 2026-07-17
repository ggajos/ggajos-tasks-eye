import { describe, expect, it } from "vitest";
import { buildRowModel } from "../../src/model";
import { file } from "../testSupport";

describe("Markdown-formatted board actions feature", () => {
  it("preserves action Markdown while removing the Tasks due marker", () => {
    const row = buildRowModel(
      file(
        "Architecture/Technology Radar.md",
        `---
status: open
---

- [ ] Review [[ADR-042 Tenant Isolation|ADR-042]] with **Security Architecture** and record the decision in \`architecture/tenant-isolation\` 📅 2026-07-08
`,
      ),
    );

    expect(row.actionLabel).toBe(
      "Review [[ADR-042 Tenant Isolation|ADR-042]] with **Security Architecture** and record the decision in `architecture/tenant-isolation`",
    );
  });
});
