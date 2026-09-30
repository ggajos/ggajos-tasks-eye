import { describe, expect, it } from "vitest";
import type { TreeNode } from "../../src/tree";
import {
  buildNoteTree,
  collapsedTreePaths,
  expandTreeLevel,
  noteTreeRows,
} from "../../src/tree";
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

describe("tree expansion", () => {
  const aChild = noteFile("Work/A child.md", '"[[Site A]]"');
  const aGrandchild = noteFile("Work/A grandchild.md", '"[[A child]]"');
  const bChild = noteFile("Work/B child.md", '"[[Site B]]"');
  const tree = buildNoteTree(SITE.path, [
    ...VAULT,
    aChild,
    aGrandchild,
    bChild,
  ])!;
  const visible = (collapsed: ReadonlySet<string>) =>
    noteTreeRows(tree, collapsed)
      .filter((row) => row.visible)
      .map((row) => row.basename);

  it("starts expanded with the current note at zero and matching ancestor/descendant indentation", () => {
    expect(noteTreeRows(tree).map((row) => [row.basename, row.depth])).toEqual([
      ["Root", 2],
      ["Work", 1],
      ["Site", 0],
      ["Site A", 1],
      ["A child", 2],
      ["A grandchild", 3],
      ["Site B", 1],
      ["B child", 2],
    ]);
    expect(noteTreeRows(tree).every((row) => row.visible)).toBe(true);
  });

  it("collapses descendants while keeping the ancestor path and current note visible", () => {
    const collapsed = collapsedTreePaths(tree);
    expect(visible(collapsed)).toEqual(["Root", "Work", "Site"]);
    expect([...collapsed]).toEqual([
      SITE.path,
      SITE_A.path,
      aChild.path,
      SITE_B.path,
    ]);
  });

  it("reveals exactly one more level per click after collapsing everything", () => {
    let collapsed = collapsedTreePaths(tree);
    collapsed = expandTreeLevel(tree, collapsed);
    expect(visible(collapsed)).toEqual([
      "Root",
      "Work",
      "Site",
      "Site A",
      "Site B",
    ]);
    collapsed = expandTreeLevel(tree, collapsed);
    expect(visible(collapsed)).toEqual([
      "Root",
      "Work",
      "Site",
      "Site A",
      "A child",
      "Site B",
      "B child",
    ]);
    collapsed = expandTreeLevel(tree, collapsed);
    expect(visible(collapsed)).toEqual(
      noteTreeRows(tree).map((row) => row.basename),
    );
    expect(expandTreeLevel(tree, collapsed)).toEqual(collapsed);
  });

  it("expands the visible frontier of mixed branches and collapses newly revealed branches", () => {
    // Site A was manually collapsed while its hidden child remained expanded.
    const collapsed = new Set([SITE_A.path, SITE_B.path]);
    const next = expandTreeLevel(tree, collapsed);
    expect(visible(next)).toEqual([
      "Root",
      "Work",
      "Site",
      "Site A",
      "A child",
      "Site B",
      "B child",
    ]);
    expect(next.has(aChild.path)).toBe(true);
    expect(collapsed).toEqual(new Set([SITE_A.path, SITE_B.path]));
  });

  it("retains child choices through a manual parent collapse and re-expansion", () => {
    const collapsed = new Set([aChild.path]);
    collapsed.add(SITE_A.path);
    expect(visible(collapsed)).not.toContain("A child");
    collapsed.delete(SITE_A.path);
    expect(visible(collapsed)).toContain("A child");
    expect(visible(collapsed)).not.toContain("A grandchild");
    collapsed.clear();
    expect(visible(collapsed)).toContain("A grandchild");
  });

  it("has no expansion actions for a leaf and keeps ancestors visible", () => {
    const leafTree = buildNoteTree(SITE_A.path, VAULT)!;
    expect(collapsedTreePaths(leafTree).size).toBe(0);
    expect(
      noteTreeRows(leafTree, new Set([ROOT.path, WORK.path])).every(
        (row) => row.visible,
      ),
    ).toBe(true);
  });
});
