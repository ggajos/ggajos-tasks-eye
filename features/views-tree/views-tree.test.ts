import { describe, expect, it } from "vitest";
import type { TreeNode } from "../../src/tree";
import { buildNoteTree } from "../../src/tree";
import { file } from "../testSupport";

// Builds an EyeFile with a specific `up` frontmatter.
function noteFile(path: string, up: string | null) {
  const frontmatter =
    up === null
      ? "---\nstatus: open\n---\n"
      : `---\nstatus: open\nup: ${up}\n---\n`;
  return file(path, `${frontmatter}\n- [ ] task`);
}

const ROOT = noteFile("Root.md", '"-"');
const WORK = noteFile("Work/Work.md", '"[[Root]]"');
const SITE = noteFile("Work/Site.md", '"[[Work]]"');
const SITE_A = noteFile("Work/Site A.md", '"[[Site]]"');
const SITE_B = noteFile("Work/Site B.md", '"[[Site]]"');
const HOME = noteFile("Home/Home.md", '"[[Root]]"');

const VAULT = [ROOT, WORK, SITE, SITE_A, SITE_B, HOME];

function names(nodes: readonly TreeNode[]): unknown {
  return nodes.map((node) => ({
    name: node.basename,
    children: names(node.children),
  }));
}

describe("buildNoteTree", () => {
  it("returns null when no active file is given", () => {
    expect(buildNoteTree(null, VAULT)).toBeNull();
  });

  it("returns null when the active file is not indexed", () => {
    expect(buildNoteTree("Somewhere/Unindexed.md", VAULT)).toBeNull();
  });

  it("builds the root-first spine down to the current note", () => {
    const result = buildNoteTree(SITE.path, VAULT)!;
    expect(result.spine.map((ref) => ref.basename)).toEqual(["Root", "Work"]);
    expect(result.current.basename).toBe("Site");
  });

  it("renders the full descendant subtree sorted by name", () => {
    const result = buildNoteTree(SITE.path, VAULT)!;
    expect(names(result.descendants)).toEqual([
      { name: "Site A", children: [] },
      { name: "Site B", children: [] },
    ]);
  });

  it("nests grandchildren under their parents", () => {
    const result = buildNoteTree(WORK.path, VAULT)!;
    expect(names(result.descendants)).toEqual([
      {
        name: "Site",
        children: [
          { name: "Site A", children: [] },
          { name: "Site B", children: [] },
        ],
      },
    ]);
  });

  it("has an empty spine when the current note is the root", () => {
    const result = buildNoteTree(ROOT.path, VAULT)!;
    expect(result.spine).toEqual([]);
    expect(result.current.basename).toBe("Root");
    expect(names(result.descendants)).toEqual([
      { name: "Home", children: [] },
      {
        name: "Work",
        children: [
          {
            name: "Site",
            children: [
              { name: "Site A", children: [] },
              { name: "Site B", children: [] },
            ],
          },
        ],
      },
    ]);
  });

  it("has no descendants when the current note is a leaf", () => {
    const result = buildNoteTree(SITE_A.path, VAULT)!;
    expect(result.spine.map((ref) => ref.basename)).toEqual([
      "Root",
      "Work",
      "Site",
    ]);
    expect(result.descendants).toEqual([]);
  });

  it("keeps whatever spine resolves when the up target is missing", () => {
    const orphan = noteFile("Orphan/Child.md", '"[[Missing Parent]]"');
    const result = buildNoteTree(orphan.path, [orphan])!;
    expect(result.spine).toEqual([]);
    expect(result.current.basename).toBe("Child");
    expect(result.descendants).toEqual([]);
  });

  it("does not loop on a cyclic up chain", () => {
    const a = noteFile("Loop/A.md", '"[[B]]"');
    const b = noteFile("Loop/B.md", '"[[A]]"');
    const result = buildNoteTree(a.path, [a, b])!;
    expect(result.current.basename).toBe("A");
    // The cycle is broken rather than expanded infinitely.
    expect(result.spine.map((ref) => ref.basename)).toEqual(["B"]);
  });
});
