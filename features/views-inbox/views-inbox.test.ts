import { describe, expect, it } from "vitest";
import { selectRows } from "../../src/model";
import { file, rowNames } from "../testSupport";

describe("Inbox view feature", () => {
  it("shows invalid notes independently of status", () => {
    const rows = selectRows([
      file(
        "Db/Growth/Valid.md",
        "---\nstatus: open\n---\n\n- [ ] valid 📅 2026-07-28",
      ),
      file("Db/Growth/Missing Task.md", "---\nstatus: open\n---\n"),
      file("Db/Growth/Closed With Open Task.md", "---\nstatus: closed\n---\n\n- [ ] open"),
    ], "inbox", "*");

    expect(rowNames(rows)).toEqual([
      "Closed With Open Task",
      "Missing Task",
    ]);
  });
});
