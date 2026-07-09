import { describe, expect, it } from "vitest";
import { buildRowModel, selectRows } from "../../src/model";
import { file, rowNames } from "../testSupport";

describe("Open view feature", () => {
  it("shows open notes and excludes hold notes", () => {
    const rows = selectRows([
      file("Db/Growth/Open.md", "---\nstatus: open\n---\n\n- [ ] open"),
      file("Db/Growth/Default Open.md", "- [ ] default open"),
      file("Db/Growth/Hold.md", "---\nstatus: hold\n---\n\n- [ ] hold"),
    ], "open", "*");

    expect(rowNames(rows)).toEqual(["Default Open", "Open"]);
  });

  it("uses the earliest unfinished due task as the row action", () => {
    const row = buildRowModel(file(
      "Db/Growth/Plan.md",
      `---
status: open
---

- [ ] later 📅 2026-07-20
- [ ] earlier 📅 2026-07-08
`,
    ));

    expect(row.actionLabel).toBe("earlier");
    expect(row.dateLabel).toBe("07-08");
  });
});
