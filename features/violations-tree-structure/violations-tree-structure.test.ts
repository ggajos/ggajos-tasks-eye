import { describe, expect, it } from "vitest";
import { buildEyeFilesFromMarkdown } from "../../src/indexer";
import { violationCodes } from "../testSupport";

function note(path: string, up: string): { path: string; markdown: string } {
  return {
    path,
    markdown: `---
status: open
up: ${up}
---

- [ ] Repair the tree 📅 2026-07-08
`,
  };
}

describe("Tree structure violations", () => {
  it("reports two-note and longer cycles", () => {
    const files = buildEyeFilesFromMarkdown([
      note("A.md", "[[B]]"),
      note("B.md", "[[A]]"),
      note("C.md", "[[D]]"),
      note("D.md", "[[E]]"),
      note("E.md", "[[C]]"),
    ]);

    expect(violationCodes(files[0]!, undefined, files)).toEqual(["up-cycle"]);
    expect(violationCodes(files[1]!, undefined, files)).toEqual(["up-cycle"]);
    expect(violationCodes(files[2]!, undefined, files)).toEqual(["up-cycle"]);
    expect(violationCodes(files[4]!, undefined, files)).toEqual(["up-cycle"]);
  });

  it("reports every duplicate root", () => {
    const files = buildEyeFilesFromMarkdown([
      note("Root A.md", "-"),
      note("Root B.md", "-"),
      note("Branch.md", "[[Root A]]"),
    ]);

    const rootA = files.find((file) => file.basename === "Root A")!;
    const rootB = files.find((file) => file.basename === "Root B")!;
    const branch = files.find((file) => file.basename === "Branch")!;

    expect(violationCodes(rootA, undefined, files)).toEqual(["multiple-roots"]);
    expect(violationCodes(rootB, undefined, files)).toEqual(["multiple-roots"]);
    expect(violationCodes(branch, undefined, files)).toEqual([]);
  });
});
