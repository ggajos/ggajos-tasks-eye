import type { ContextFile } from "./context";
import { isRootFile, resolveUpTarget } from "./context";

export interface TreeNoteRef {
  path: string;
  basename: string;
}

export interface TreeNode extends TreeNoteRef {
  children: TreeNode[];
}

export interface NoteTree {
  spine: TreeNoteRef[];
  current: TreeNoteRef;
  descendants: TreeNode[];
}

function basenameFromPath(path: string): string {
  const withoutExtension = path.replace(/\.md$/i, "");
  return withoutExtension.split("/").pop() ?? withoutExtension;
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

  while (!isRootFile(node)) {
    const resolution = resolveUpTarget(node, files);
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
  current: ContextFile,
  files: readonly ContextFile[],
): TreeNode[] {
  const childrenByParent = new Map<string, ContextFile[]>();
  for (const file of files) {
    if (isRootFile(file)) continue;
    const resolution = resolveUpTarget(file, files);
    if (resolution.kind !== "indexed") continue;
    const parentPath = resolution.file.path;
    const siblings = childrenByParent.get(parentPath) ?? [];
    siblings.push(file);
    childrenByParent.set(parentPath, siblings);
  }

  const build = (node: ContextFile, seen: ReadonlySet<string>): TreeNode[] => {
    const children = (childrenByParent.get(node.path) ?? [])
      .filter((child) => !seen.has(child.path))
      .sort(compareRefs);
    return children.map((child) => {
      const nextSeen = new Set(seen).add(child.path);
      return { ...toRef(child), children: build(child, nextSeen) };
    });
  };

  return build(current, new Set([current.path]));
}

export type TreeLinkResolver = (ref: TreeNoteRef) => string;

export function noteTreeMarkdown(
  tree: NoteTree,
  toLinkText: TreeLinkResolver,
): string {
  const lines: string[] = [];
  const push = (ref: TreeNoteRef, depth: number): void => {
    lines.push(`${"  ".repeat(depth)}- [[${toLinkText(ref)}]]`);
  };

  let depth = 0;
  for (const ref of tree.spine) push(ref, depth++);
  push(tree.current, depth);

  const walk = (nodes: readonly TreeNode[], nodeDepth: number): void => {
    for (const node of nodes) {
      push(node, nodeDepth);
      walk(node.children, nodeDepth + 1);
    }
  };
  walk(tree.descendants, depth + 1);

  return lines.join("\n");
}

export function buildNoteTree(
  activePath: string | null,
  files: readonly ContextFile[],
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
