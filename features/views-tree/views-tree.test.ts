import { describe, expect, it } from "vitest";
import type { TreeNode } from "../../src/tree";
import {
  buildNoteTree,
  collapsedTreePaths,
  expandTreeLevel,
  filterClosedDescendants,
  noteTreeRows,
} from "../../src/tree";
import { file } from "../testSupport";

// Builds an EyeFile with a specific `up` frontmatter.
function noteFile(
  path: string,
  up: string | null,
  status: string | null = "open",
) {
  const statusLine = status === null ? "" : `status: ${status}\n`;
  const frontmatter =
    up === null
      ? `---\n${statusLine}---\n`
      : `---\n${statusLine}up: ${up}\n---\n`;
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

describe("closed descendant filtering", () => {
  const closedRoot = noteFile("Root.md", '"-"', "closed");
  const current = noteFile("Current.md", '"[[Root]]"', "closed");
  const openLeaf = noteFile("A open leaf.md", '"[[Current]]"');
  const closedLeaf = noteFile("B closed leaf.md", '"[[Current]]"', "closed");
  const bridge = noteFile("C closed bridge.md", '"[[Current]]"', "closed");
  const deepBridge = noteFile(
    "D closed bridge.md",
    '"[[C closed bridge]]"',
    "closed",
  );
  const openGrandchild = noteFile(
    "E open grandchild.md",
    '"[[D closed bridge]]"',
  );
  const closedBranch = noteFile(
    "F closed branch.md",
    '"[[Current]]"',
    "closed",
  );
  const closedChild = noteFile(
    "G closed child.md",
    '"[[F closed branch]]"',
    "closed",
  );
  const closedSibling = noteFile(
    "H closed sibling.md",
    '"[[C closed bridge]]"',
    "closed",
  );
  const tree = buildNoteTree(current.path, [
    closedRoot,
    current,
    openLeaf,
    closedLeaf,
    bridge,
    deepBridge,
    openGrandchild,
    closedBranch,
    closedChild,
    closedSibling,
  ])!;
  const filtered = filterClosedDescendants(tree);
  const visible = (
    value: typeof tree,
    collapsed: ReadonlySet<string> = new Set(),
  ) =>
    noteTreeRows(value, collapsed)
      .filter((row) => row.visible)
      .map((row) => row.basename);

  it("hides closed leaves and branches whose entire subtree is closed", () => {
    expect(visible(filtered)).toEqual([
      "Root",
      "Current",
      "A open leaf",
      "C closed bridge",
      "D closed bridge",
      "E open grandchild",
    ]);
    // Closed notes are hidden even if their task checkbox remains unfinished.
    expect(closedLeaf.tasks.some((task) => !task.completed)).toBe(true);
    expect(visible(filtered)).not.toContain(closedLeaf.basename);
  });

  it("keeps the closed current note and closed parent path, including for a closed leaf", () => {
    const leafTree = filterClosedDescendants(
      buildNoteTree(closedChild.path, [
        closedRoot,
        current,
        closedBranch,
        closedChild,
      ])!,
    );
    expect(visible(leafTree)).toEqual([
      "Root",
      "Current",
      "F closed branch",
      "G closed child",
    ]);
  });

  it("keeps every closed bridge to an indirect non-closed descendant", () => {
    expect(names(filtered.descendants)).toEqual([
      { name: "A open leaf", children: [] },
      {
        name: "C closed bridge",
        children: [
          {
            name: "D closed bridge",
            children: [{ name: "E open grandchild", children: [] }],
          },
        ],
      },
    ]);
    // Collapsing the branch does not change eligibility: the path is still present.
    expect(visible(filtered, new Set([bridge.path]))).toContain(
      bridge.basename,
    );
    expect(visible(filtered, new Set([bridge.path]))).not.toContain(
      openGrandchild.basename,
    );
  });

  it("does not mutate the full tree, so turning the filter off can restore it", () => {
    expect(visible(tree)).toContain(closedLeaf.basename);
    expect(visible(tree)).toContain(closedBranch.basename);
    expect(
      tree.descendants.find((node) => node.path === bridge.path)?.children,
    ).toHaveLength(2);
    expect(filtered.spine).toBe(tree.spine);
    expect(filtered.current).toBe(tree.current);
  });

  it("keeps missing or unsupported statuses and open notes with completed tasks", () => {
    const absent = noteFile("Absent.md", '"[[Current]]"', null);
    const unsupported = noteFile("Unsupported.md", '"[[Current]]"', "done");
    const capitalized = noteFile("Capitalized.md", '"[[Current]]"', "Closed");
    const checked = file(
      "Checked.md",
      "---\nstatus: open\nup: '[[Current]]'\n---\n- [x] Finished task",
    );
    const result = filterClosedDescendants(
      buildNoteTree(current.path, [
        closedRoot,
        current,
        absent,
        unsupported,
        capitalized,
        checked,
      ])!,
    );
    expect(visible(result)).toEqual([
      "Root",
      "Current",
      "Absent",
      "Capitalized",
      "Checked",
      "Unsupported",
    ]);
  });

  it("removes the branch toggle when all of an open note's children are filtered", () => {
    const parent = noteFile("Open parent.md", '"[[Current]]"');
    const child = noteFile("Closed child.md", '"[[Open parent]]"', "closed");
    const result = filterClosedDescendants(
      buildNoteTree(current.path, [closedRoot, current, parent, child])!,
    );
    expect(
      noteTreeRows(result).find((row) => row.path === parent.path)?.children,
    ).toEqual([]);
    expect(collapsedTreePaths(result)).toEqual(new Set([current.path]));
  });

  it("expands only eligible branches one level at a time", () => {
    let collapsed = collapsedTreePaths(tree);
    collapsed = expandTreeLevel(filtered, collapsed);
    expect(visible(filtered, collapsed)).toEqual([
      "Root",
      "Current",
      "A open leaf",
      "C closed bridge",
    ]);
    expect(collapsed.has(closedBranch.path)).toBe(true);
    collapsed = expandTreeLevel(filtered, collapsed);
    expect(visible(filtered, collapsed)).toEqual([
      "Root",
      "Current",
      "A open leaf",
      "C closed bridge",
      "D closed bridge",
    ]);
    collapsed = expandTreeLevel(filtered, collapsed);
    expect(visible(filtered, collapsed)).toContain(openGrandchild.basename);
  });
});
