export const DEFAULT_MANAGED_FOLDER_PATH = "/";

export function normalizeManagedFolderPath(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_MANAGED_FOLDER_PATH;
  const normalized = value
    .trim()
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
  return normalized || DEFAULT_MANAGED_FOLDER_PATH;
}

export function vaultFolderPath(managedFolderPath: string): string {
  const normalized = normalizeManagedFolderPath(managedFolderPath);
  return normalized === DEFAULT_MANAGED_FOLDER_PATH ? "" : normalized;
}

export function isPathInManagedFolder(
  path: string,
  managedFolderPath: string,
): boolean {
  const root = vaultFolderPath(managedFolderPath);
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  return root === "" || normalizedPath === root ||
    normalizedPath.startsWith(`${root}/`);
}

export function isPathRelatedToManagedFolder(
  path: string,
  managedFolderPath: string,
): boolean {
  if (isPathInManagedFolder(path, managedFolderPath)) return true;
  const root = vaultFolderPath(managedFolderPath);
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  return root !== "" && normalizedPath !== "" &&
    root.startsWith(`${normalizedPath}/`);
}

export function missingManagedFolderMessage(
  managedFolderPath: string,
): string {
  return `Tasks Eye: configured notes folder not found: ${
    normalizeManagedFolderPath(managedFolderPath)
  }`;
}
