import type { ContextFile } from "./noteGraph";
import { basenameFromPath, isRootFile, noteGraph } from "./noteGraph";

export interface TreeNoteRef {
  path: string;
  basename: string;
}

export interface TreeNode extends TreeNoteRef {
  closed: boolean;
  children: TreeNode[];
}

export interface NoteTree {
  spine: TreeNoteRef[];
  current: TreeNoteRef;
  descendants: TreeNode[];
}

interface TreeFile extends ContextFile {
  status?: unknown;
}

function toRef(file: ContextFile): TreeNoteRef {
  return { path: file.path, basename: file.basename };
}

function compareRefs(a: TreeNoteRef, b: TreeNoteRef): number {
  return a.basename.localeCompare(b.basename) || a.path.localeCompare(b.path);
}

export function buildSpine(
  current: ContextFile,
  files: readonly ContextFile[],
): TreeNoteRef[] {
  const spine: TreeNoteRef[] = [];
  const seen = new Set<string>([current.path]);
  let node = current;

  const graph = noteGraph(files);
  while (!isRootFile(node)) {
    const resolution = graph.upTarget(node);
    if (resolution.kind === "missing") break;
    if (resolution.kind === "resolved-but-unindexed") {
      spine.push({
        path: resolution.path,
        basename: basenameFromPath(resolution.path),
      });
      break;
    }

    const parent = resolution.file;
    if (seen.has(parent.path)) break;
    seen.add(parent.path);
    spine.push(toRef(parent));
    node = parent;
  }

  return spine.reverse();
}

export function buildDescendants(
  current: TreeFile,
  files: readonly TreeFile[],
): TreeNode[] {
  const graph = noteGraph(files);
  const build = (node: TreeFile, seen: ReadonlySet<string>): TreeNode[] => {
    const children = [...graph.children(node)]
      .filter((child) => !seen.has(child.path))
      .sort(compareRefs);
    return children.map((child) => {
      const nextSeen = new Set(seen).add(child.path);
      return {
        ...toRef(child),
        closed: "status" in child && child.status === "closed",
        children: build(child, nextSeen),
      };
    });
  };

  return build(current, new Set([current.path]));
}

/** Keep the paths to non-closed descendants; never filter the current note or its spine. */
export function filterClosedDescendants(tree: NoteTree): NoteTree {
  const filter = (nodes: readonly TreeNode[]): TreeNode[] =>
    nodes.flatMap((node) => {
      const children = filter(node.children);
      return node.closed && children.length === 0
        ? []
        : [{ ...node, children }];
    });
  return { ...tree, descendants: filter(tree.descendants) };
}

export interface TreeRow extends TreeNoteRef {
  depth: number;
  current: boolean;
  visible: boolean;
  children: readonly TreeNode[];
}

export function noteTreeRows(
  tree: NoteTree,
  collapsed: ReadonlySet<string> = new Set(),
): TreeRow[] {
  const rows: TreeRow[] = tree.spine.map((ref, index) => ({
    ...ref,
    depth: tree.spine.length - index,
    current: false,
    visible: true,
    children: [],
  }));
  const walk = (
    node: TreeNode,
    depth: number,
    visible: boolean,
    current = false,
  ): void => {
    rows.push({ ...node, depth, visible, current });
    for (const child of node.children) {
      walk(child, depth + 1, visible && !collapsed.has(node.path));
    }
  };
  walk(
    { ...tree.current, closed: false, children: tree.descendants },
    0,
    true,
    true,
  );
  return rows;
}

export function collapsedTreePaths(tree: NoteTree): Set<string> {
  return new Set(
    noteTreeRows(tree)
      .filter((row) => row.children.length > 0)
      .map((row) => row.path),
  );
}

export function expandTreeLevel(
  tree: NoteTree,
  collapsed: ReadonlySet<string>,
): Set<string> {
  const next = new Set(collapsed);
  // Take the frontier before changing anything: a click reveals only one level.
  for (const row of noteTreeRows(tree, collapsed)) {
    if (!row.visible || !collapsed.has(row.path) || row.children.length === 0)
      continue;
    next.delete(row.path);
    for (const child of row.children) {
      if (child.children.length > 0) next.add(child.path);
    }
  }
  return next;
}

export function buildNoteTree(
  activePath: string | null,
  files: readonly TreeFile[],
): NoteTree | null {
  if (!activePath) return null;
  const current = files.find((file) => file.path === activePath);
  if (!current) return null;

  return {
    spine: buildSpine(current, files),
    current: toRef(current),
    descendants: buildDescendants(current, files),
  };
}
