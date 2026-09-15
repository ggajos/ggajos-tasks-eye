import { describe, expect, it } from "vitest";
import { getContextForFile } from "../../src/context";
import { parseFrontmatter } from "../../src/indexer";
import { selectRows } from "../../src/model";
import { parseTaskLine } from "../../src/taskParsing";
import { files, rowNames } from "../testSupport";

describe("Vault conventions feature", () => {
  it("parses status frontmatter from managed notes", () => {
    expect(parseFrontmatter("---\nstatus: open\nup: -\n---\n")).toMatchObject({
      status: "open",
      up: "-",
    });
  });

  it("treats missing or blank status as open", () => {
    const indexedFiles = files([
      {
        path: "Root.md",
        markdown: "---\nstatus: open\nup: -\n---\n\n- [ ] root 📅 2026-07-09",
      },
      {
        path: "Growth.md",
        markdown: "---\nstatus: closed\nup: [[Root]]\n---\n",
      },
      {
        path: "Growth/Missing.md",
        markdown:
          "---\nstatus: open\nup: [[Growth]]\n---\n\n- [ ] missing status",
      },
      {
        path: "Growth/Blank.md",
        markdown: "---\nstatus:\nup: [[Growth]]\n---\n\n- [ ] blank status",
      },
      {
        path: "Growth/Reviewing.md",
        markdown:
          "---\nstatus: reviewing\nup: [[Growth]]\n---\n\n- [ ] reviewing",
      },
    ]);
    const rows = selectRows(indexedFiles, "open", "Growth");

    expect(rowNames(rows)).toEqual(["Blank", "Missing"]);
  });

  it("reads Tasks due dates from task text", () => {
    const task = parseTaskLine("- [ ] Follow up 📅 2026-07-08", 0);

    expect(task?.dueIso).toBe("2026-07-08");
    expect(task?.completed).toBe(false);
  });

  it("resolves context from the parent link, not the folder", () => {
    const indexedFiles = files([
      { path: "Root.md", markdown: "---\nup: -\n---\n" },
      {
        path: "Contexts/Growth.md",
        markdown: "---\nup: [[Root]]\n---\n",
      },
      {
        path: "Elsewhere/Review.md",
        markdown: "---\nup: [[Growth]]\n---\n",
      },
    ]);

    const review = indexedFiles.find((value) => value.basename === "Review")!;
    expect(getContextForFile(review, indexedFiles)).toBe("Growth");
  });
});
