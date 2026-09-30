export interface ContextFile {
  path: string;
  basename: string;
  up?: unknown;
  upTargetPath?: string;
}

export type UpTargetResolution =
  | { kind: "indexed"; file: ContextFile }
  | { kind: "resolved-but-unindexed"; path: string }
  | { kind: "missing" };

export interface UpChainResolution {
  root: ContextFile | null;
  contextNode: ContextFile | null;
  targetMissing: boolean;
  cycle: boolean;
}

/** Resolves a wikilink target written in `sourcePath` to a vault path. */
export type LinkResolver = (
  target: string,
  sourcePath: string,
) => string | undefined;

export const NO_CONTEXT = "-";
export const GLOBAL_CONTEXT_FALLBACK = "*";

const WIKILINK_RE = /^\[\[([^|\]]+)(?:\|[^\]]*)?\]\]$/;

export function basenameFromPath(path: string): string {
  const withoutExtension = path.replace(/\.md$/i, "");
  return withoutExtension.split("/").pop() ?? withoutExtension;
}

export function hasUp(file: ContextFile): boolean {
  return Object.getOwnPropertyDescriptor(file, "up") !== undefined;
}

export function isRootFile(file: ContextFile): boolean {
  return file.up === "-";
}

/** The raw wikilink target of an `up` value, e.g. `Folder/Note` for `[[Folder/Note|x]]`. */
export function upLinkTarget(up: unknown): string | null {
  const value = Array.isArray(up) && up.length === 1 ? (up[0] as unknown) : up;
  if (typeof value !== "string") return null;
  const match = value.trim().match(WIKILINK_RE);
  return match?.[1]?.trim() || null;
}

function byPathOrder(a: ContextFile, b: ContextFile): number {
  return a.path.localeCompare(b.path);
}

function firstByBasename(
  files: readonly ContextFile[],
): Map<string, ContextFile> {
  const result = new Map<string, ContextFile>();
  for (const file of [...files].sort(byPathOrder)) {
    if (!result.has(file.basename)) result.set(file.basename, file);
  }
  return result;
}

/** Adapter used outside Obsidian: first indexed note (by path) with the target's basename. */
export function basenameLinkResolver(
  files: readonly ContextFile[],
): LinkResolver {
  const index = firstByBasename(files);
  return (target) => index.get(basenameFromPath(target))?.path;
}

/**
 * Records each note's resolved `up` target. With `recordUnresolved`, an
 * unresolved link is stored as an explicit `undefined`, which the graph reads
 * as authoritative "missing" instead of falling back to basename lookup.
 */
export function assignUpTargets(
  files: readonly ContextFile[],
  resolve: LinkResolver,
  recordUnresolved = false,
): void {
  for (const file of files) {
    const target = upLinkTarget(file.up);
    const path = target ? resolve(target, file.path) : undefined;
    if (path !== undefined || recordUnresolved) file.upTargetPath = path;
  }
}

export interface NoteGraph {
  upTarget(file: ContextFile): UpTargetResolution;
  chain(file: ContextFile): UpChainResolution;
  contextOf(file: ContextFile): string;
  children(file: ContextFile): ContextFile[];
  root(): ContextFile | undefined;
  rootCount(): number;
  globalContext(): string;
  contexts(): string[];
}

const NO_CHAIN: UpChainResolution = {
  root: null,
  contextNode: null,
  targetMissing: false,
  cycle: false,
};

function createNoteGraph(files: readonly ContextFile[]): NoteGraph {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const byBasename = firstByBasename(files);
  const chains = new Map<ContextFile, UpChainResolution>();
  let childIndex: Map<string, ContextFile[]> | null = null;
  const roots = files.filter(isRootFile).sort(byPathOrder);

  const upTarget = (file: ContextFile): UpTargetResolution => {
    if (Object.getOwnPropertyDescriptor(file, "upTargetPath") !== undefined) {
      const targetPath = file.upTargetPath;
      if (!targetPath) return { kind: "missing" };
      const indexed = byPath.get(targetPath);
      return indexed
        ? { kind: "indexed", file: indexed }
        : { kind: "resolved-but-unindexed", path: targetPath };
    }

    const target = upLinkTarget(file.up);
    if (!target) return { kind: "missing" };
    const indexed = byBasename.get(basenameFromPath(target));
    return indexed ? { kind: "indexed", file: indexed } : { kind: "missing" };
  };

  const walk = (file: ContextFile): UpChainResolution => {
    if (isRootFile(file)) {
      return { ...NO_CHAIN, root: file, contextNode: file };
    }
    if (!hasUp(file)) return NO_CHAIN;

    const seen = new Set<string>();
    let current = file;
    let contextNode: ContextFile = file;
    const maxSteps = Math.max(files.length + 1, 2);

    for (let step = 0; step < maxSteps; step++) {
      if (seen.has(current.path)) return { ...NO_CHAIN, cycle: true };
      seen.add(current.path);

      if (isRootFile(current)) {
        return { ...NO_CHAIN, root: current, contextNode };
      }

      const resolution = upTarget(current);
      if (resolution.kind === "missing") {
        return { ...NO_CHAIN, targetMissing: true };
      }
      if (resolution.kind === "resolved-but-unindexed") {
        return {
          ...NO_CHAIN,
          root: {
            path: resolution.path,
            basename: basenameFromPath(resolution.path),
            up: "-",
          },
          contextNode,
        };
      }

      const parent = resolution.file;
      if (isRootFile(parent)) {
        return { ...NO_CHAIN, root: parent, contextNode };
      }
      contextNode = parent;
      current = parent;
    }

    return { ...NO_CHAIN, cycle: true };
  };

  const chain = (file: ContextFile): UpChainResolution => {
    let result = chains.get(file);
    if (!result) {
      result = walk(file);
      chains.set(file, result);
    }
    return result;
  };

  const contextOf = (file: ContextFile): string =>
    chain(file).contextNode?.basename ?? NO_CONTEXT;

  const globalContext = (): string =>
    roots[0]?.basename ?? GLOBAL_CONTEXT_FALLBACK;

  return {
    upTarget,
    chain,
    contextOf,
    children(file) {
      if (!childIndex) {
        childIndex = new Map();
        for (const candidate of files) {
          if (isRootFile(candidate)) continue;
          const resolution = upTarget(candidate);
          if (resolution.kind !== "indexed") continue;
          const siblings = childIndex.get(resolution.file.path) ?? [];
          siblings.push(candidate);
          childIndex.set(resolution.file.path, siblings);
        }
      }
      return childIndex.get(file.path) ?? [];
    },
    root: () => roots[0],
    rootCount: () => roots.length,
    globalContext,
    contexts() {
      const global = globalContext();
      const contexts = new Set<string>();
      for (const file of files) {
        const context = contextOf(file);
        if (context !== NO_CONTEXT && context !== global) contexts.add(context);
      }
      return Array.from(contexts).sort((a, b) => a.localeCompare(b));
    },
  };
}

const graphs = new WeakMap<
  readonly ContextFile[],
  { length: number; graph: NoteGraph }
>();

/**
 * The note graph for one indexed file set. Graphs are memoized per array, so
 * callers sharing the same `files` array share chain walks.
 */
export function noteGraph(files: readonly ContextFile[]): NoteGraph {
  const cached = graphs.get(files);
  if (cached && cached.length === files.length) return cached.graph;
  const graph = createNoteGraph(files);
  graphs.set(files, { length: files.length, graph });
  return graph;
}
