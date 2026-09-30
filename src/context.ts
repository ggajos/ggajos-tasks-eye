import type {
  ContextFile,
  UpChainResolution,
  UpTargetResolution,
} from "./noteGraph";
import { GLOBAL_CONTEXT_FALLBACK, noteGraph } from "./noteGraph";

export { GLOBAL_CONTEXT_FALLBACK, isRootFile } from "./noteGraph";
export type { ContextFile, UpChainResolution, UpTargetResolution };

export const VACATION_CONTEXT = "ooo";

function indexed(
  file: ContextFile,
  files: readonly ContextFile[],
): readonly ContextFile[] {
  return files.length > 0 ? files : [file];
}

export function resolveUpTarget(
  file: ContextFile,
  files: readonly ContextFile[],
): UpTargetResolution {
  return noteGraph(files).upTarget(file);
}

export function resolveUpChain(
  file: ContextFile,
  files: readonly ContextFile[] = [file],
): UpChainResolution {
  return noteGraph(indexed(file, files)).chain(file);
}

export function getContextForFile(
  file: ContextFile,
  files: readonly ContextFile[] = [file],
): string {
  return noteGraph(indexed(file, files)).contextOf(file);
}

export function getRootFile(
  files: readonly ContextFile[],
): ContextFile | undefined {
  return noteGraph(files).root();
}

export function getGlobalContext(files: readonly ContextFile[]): string {
  return noteGraph(files).globalContext();
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
  return noteGraph(files).contexts();
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
