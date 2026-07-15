import {
  DEFAULT_MANAGED_FOLDER_PATH,
  isPathInManagedFolder,
  vaultFolderPath,
} from "./managedPath";

export const VACATION_CONTEXT = "ooo";

function folderPathFromFilePath(filePath: string): string {
  const separator = filePath.lastIndexOf("/");
  return separator < 0 ? "" : filePath.slice(0, separator);
}

function relativeFolderPath(
  folderPath: string,
  managedFolderPath: string,
): string | null {
  if (!isPathInManagedFolder(folderPath, managedFolderPath)) return null;
  const root = vaultFolderPath(managedFolderPath);
  if (!root) return folderPath.replace(/^\/+|\/+$/g, "");
  if (folderPath === root) return "";
  return folderPath.slice(root.length).replace(/^\/+/, "");
}

export function getTopLevelContext(
  filePath: string,
  managedFolderPath = DEFAULT_MANAGED_FOLDER_PATH,
): string {
  const context = getContextFromPath(filePath, managedFolderPath);
  if (context === "-") return context;
  return context.split("/")[0] ?? "-";
}

export function matchesContextFilter(
  filePath: string,
  filter: string,
  managedFolderPath = DEFAULT_MANAGED_FOLDER_PATH,
): boolean {
  if (!filter || filter === "*") return true;
  return getContextFromPath(filePath, managedFolderPath) === filter;
}

export function getContextFromFolderPath(
  folderPath: string,
  managedFolderPath = DEFAULT_MANAGED_FOLDER_PATH,
): string {
  const relative = relativeFolderPath(folderPath, managedFolderPath);
  return relative || "-";
}

export function getContextFromPath(
  filePath: string,
  managedFolderPath = DEFAULT_MANAGED_FOLDER_PATH,
): string {
  return getContextFromFolderPath(
    folderPathFromFilePath(filePath),
    managedFolderPath,
  );
}

export function discoverContexts(
  files: Array<{ path: string; managedFolderPath?: string }>,
): string[] {
  const contexts = new Set<string>();
  for (const file of files) {
    const ctx = getContextFromPath(
      file.path,
      file.managedFolderPath ?? DEFAULT_MANAGED_FOLDER_PATH,
    );
    if (ctx !== "-") contexts.add(ctx);
  }
  return Array.from(contexts).sort((a, b) => a.localeCompare(b));
}

export function withVacationContext(contexts: readonly string[]): string[] {
  return Array.from(new Set([...contexts, VACATION_CONTEXT])).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function formatContextLabel(context: string): string {
  if (context === VACATION_CONTEXT) return "OOO";
  return context;
}

export function normalizeContextFilter(
  contextFilter: string,
  contexts: readonly string[],
): string {
  if (!contextFilter || contextFilter === "*") return "*";
  return contexts.includes(contextFilter) ? contextFilter : "*";
}
