import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "../../src/indexer";
import { selectRows } from "../../src/model";
import { parseTaskLine } from "../../src/taskParsing";
import { file, rowNames } from "../testSupport";

describe("Vault conventions feature", () => {
  it("parses status frontmatter from managed notes", () => {
    expect(parseFrontmatter("---\nstatus: open\n---\n").status).toBe("open");
  });

  it("treats missing or blank status as open", () => {
    const rows = selectRows([
      file("Growth/Missing.md", "- [ ] missing status"),
      file("Growth/Blank.md", "---\nstatus:\n---\n\n- [ ] blank status"),
      file("Growth/Hold.md", "---\nstatus: hold\n---\n\n- [ ] hold"),
    ], "open", "*");

    expect(rowNames(rows)).toEqual(["Blank", "Missing"]);
  });

  it("reads Tasks due dates from task text", () => {
    const task = parseTaskLine("- [ ] Follow up 📅 2026-07-08", 0);

    expect(task?.dueIso).toBe("2026-07-08");
    expect(task?.completed).toBe(false);
  });
});
