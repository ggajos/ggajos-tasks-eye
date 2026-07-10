import { describe, expect, it } from "vitest";
import { selectRows } from "../../src/model";
import { file, rowNames } from "../testSupport";

describe("Inbox view feature", () => {
  it("shows invalid notes independently of status", () => {
    const rows = selectRows([
      file(
        "Db/Architecture/Valid Decision.md",
        "---\nstatus: open\n---\n\n- [ ] review decision 📅 2026-07-28",
      ),
      file("Db/Leadership/Engineering Strategy Q3.md", "---\nstatus: open\n---\n"),
      file("Db/Architecture/ADR-042 Tenant Isolation.md", "---\nstatus: closed\n---\n\n- [ ] publish guardrails"),
    ], "inbox", "*");

    expect(rowNames(rows)).toEqual([
      "ADR-042 Tenant Isolation",
      "Engineering Strategy Q3",
    ]);
  });
});
