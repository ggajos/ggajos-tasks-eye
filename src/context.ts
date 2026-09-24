export const VACATION_CONTEXT = "ooo";
export const GLOBAL_CONTEXT_FALLBACK = "*";

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

const WIKILINK_RE = /^\[\[([^|\]]+)(?:\|[^\]]*)?\]\]$/;

function targetBasename(target: string): string {
  const withoutExtension = target.replace(/\.md$/i, "");
  return withoutExtension.split("/").pop() ?? withoutExtension;
}

export function isRootFile(file: ContextFile): boolean {
  return file.up === "-";
}

export function upTargetBasename(file: ContextFile): string | null {
  const value =
    Array.isArray(file.up) && file.up.length === 1
      ? (file.up[0] as unknown)
      : file.up;
  if (typeof value !== "string") return null;
  const match = value.trim().match(WIKILINK_RE);
  return match ? targetBasename(match[1]!.trim()) : null;
}

function filesByPath(files: readonly ContextFile[]): Map<string, ContextFile> {
  return new Map(files.map((file) => [file.path, file]));
}

function filesByBasename(
  files: readonly ContextFile[],
): Map<string, ContextFile> {
  const result = new Map<string, ContextFile>();
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    if (!result.has(file.basename)) result.set(file.basename, file);
  }
  return result;
}

export function resolveUpTarget(
  file: ContextFile,
  files: readonly ContextFile[],
): UpTargetResolution {
  if (Object.getOwnPropertyDescriptor(file, "upTargetPath") !== undefined) {
    const targetPath = file.upTargetPath;
    if (!targetPath) return { kind: "missing" };

    const indexed = filesByPath(files).get(targetPath);
    return indexed
      ? { kind: "indexed", file: indexed }
      : { kind: "resolved-but-unindexed", path: targetPath };
  }

  const target = upTargetBasename(file);
  if (!target) return { kind: "missing" };

  const indexed = filesByBasename(files).get(target);
  return indexed ? { kind: "indexed", file: indexed } : { kind: "missing" };
}

export function resolveUpChain(
  file: ContextFile,
  files: readonly ContextFile[] = [file],
): UpChainResolution {
  const indexedFiles = files.length > 0 ? files : [file];
  if (isRootFile(file)) {
    return {
      root: file,
      contextNode: file,
      targetMissing: false,
      cycle: false,
    };
  }
  if (Object.getOwnPropertyDescriptor(file, "up") === undefined) {
    return {
      root: null,
      contextNode: null,
      targetMissing: false,
      cycle: false,
    };
  }

  const seen = new Set<string>();
  let current = file;
  let contextNode: ContextFile = file;
  const maxSteps = Math.max(indexedFiles.length + 1, 2);

  for (let step = 0; step < maxSteps; step++) {
    if (seen.has(current.path)) {
      return {
        root: null,
        contextNode: null,
        targetMissing: false,
        cycle: true,
      };
    }
    seen.add(current.path);

    if (isRootFile(current)) {
      return {
        root: current,
        contextNode,
        targetMissing: false,
        cycle: false,
      };
    }

    const resolution = resolveUpTarget(current, indexedFiles);
    if (resolution.kind === "missing") {
      return {
        root: null,
        contextNode: null,
        targetMissing: true,
        cycle: false,
      };
    }

    if (resolution.kind === "resolved-but-unindexed") {
      return {
        root: {
          path: resolution.path,
          basename: targetBasename(resolution.path),
          up: "-",
        },
        contextNode,
        targetMissing: false,
        cycle: false,
      };
    }

    const parent = resolution.file;
    if (isRootFile(parent)) {
      return {
        root: parent,
        contextNode,
        targetMissing: false,
        cycle: false,
      };
    }

    contextNode = parent;
    current = parent;
  }

  return {
    root: null,
    contextNode: null,
    targetMissing: false,
    cycle: true,
  };
}

export function getContextForFile(
  file: ContextFile,
  files: readonly ContextFile[] = [file],
): string {
  return resolveUpChain(file, files).contextNode?.basename ?? "-";
}

export function getRootFile(
  files: readonly ContextFile[],
): ContextFile | undefined {
  return files
    .filter(isRootFile)
    .sort((a, b) => a.path.localeCompare(b.path))[0];
}

export function getGlobalContext(files: readonly ContextFile[]): string {
  return getRootFile(files)?.basename ?? GLOBAL_CONTEXT_FALLBACK;
}

export function isGlobalContextFilter(
  filter: string,
  files: readonly ContextFile[],
): boolean {
  return (
    !filter ||
    filter === GLOBAL_CONTEXT_FALLBACK ||
    filter === getGlobalContext(files)
  );
}

export function matchesContextFilter(
  file: ContextFile,
  filter: string,
  files: readonly ContextFile[] = [file],
): boolean {
  if (isGlobalContextFilter(filter, files)) return true;
  return getContextForFile(file, files) === filter;
}

export function discoverContexts(files: readonly ContextFile[]): string[] {
  const globalContext = getGlobalContext(files);
  const contexts = new Set<string>();
  for (const file of files) {
    const context = getContextForFile(file, files);
    if (context !== "-" && context !== globalContext) contexts.add(context);
  }
  return Array.from(contexts).sort((a, b) => a.localeCompare(b));
}

export function withVacationContext(contexts: readonly string[]): string[] {
  return Array.from(new Set([...contexts, VACATION_CONTEXT])).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function formatContextLabel(context: string): string {
  if (context === VACATION_CONTEXT) return "OOO";
  return context;
}

export function normalizeContextFilter(
  contextFilter: string,
  contexts: readonly string[],
  globalContext = GLOBAL_CONTEXT_FALLBACK,
): string {
  if (
    !contextFilter ||
    contextFilter === GLOBAL_CONTEXT_FALLBACK ||
    contextFilter === globalContext
  ) {
    return globalContext;
  }
  return contexts.includes(contextFilter) ? contextFilter : globalContext;
}
