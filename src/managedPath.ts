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
  return (
    root === "" ||
    normalizedPath === root ||
    normalizedPath.startsWith(`${root}/`)
  );
}

export function isPathRelatedToManagedFolder(
  path: string,
  managedFolderPath: string,
): boolean {
  if (isPathInManagedFolder(path, managedFolderPath)) return true;
  const root = vaultFolderPath(managedFolderPath);
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  return (
    root !== "" &&
    normalizedPath !== "" &&
    root.startsWith(`${normalizedPath}/`)
  );
}

export function missingManagedFolderMessage(managedFolderPath: string): string {
  return `Tasks Eye can't find the notes folder "${normalizeManagedFolderPath(
    managedFolderPath,
  )}". Choose another folder in settings.`;
}

export function normalizeExcludedFolderPath(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") return "";
  return normalizeManagedFolderPath(value);
}

export function normalizeExcludedFolderPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const entry of value) {
    const normalized = normalizeExcludedFolderPath(entry);
    if (normalized && !result.includes(normalized)) result.push(normalized);
  }
  return result;
}

export function isPathExcluded(
  path: string,
  excludedFolderPaths: readonly string[],
): boolean {
  return excludedFolderPaths.some((excluded) => {
    const normalized = normalizeExcludedFolderPath(excluded);
    return normalized !== "" && isPathInManagedFolder(path, normalized);
  });
}

export function isPathInSources(
  path: string,
  managedFolderPath: string,
  excludedFolderPaths: readonly string[],
): boolean {
  return (
    isPathInManagedFolder(path, managedFolderPath) &&
    !isPathExcluded(path, excludedFolderPaths)
  );
}

// Returns the first exclusion that equals or contains the notes folder.
export function exclusionCoveringNotesFolder(
  managedFolderPath: string,
  excludedFolderPaths: readonly string[],
): string | null {
  const notesFolder = vaultFolderPath(managedFolderPath);
  for (const excluded of excludedFolderPaths) {
    const normalized = normalizeExcludedFolderPath(excluded);
    if (normalized === "") continue;
    const excludedRoot = vaultFolderPath(normalized);
    if (
      excludedRoot === "" ||
      notesFolder === excludedRoot ||
      notesFolder.startsWith(`${excludedRoot}/`)
    ) {
      return normalized;
    }
  }
  return null;
}

export function isExclusionOutsideNotesFolder(
  excludedFolderPath: string,
  managedFolderPath: string,
): boolean {
  const normalized = normalizeExcludedFolderPath(excludedFolderPath);
  if (normalized === "") return false;
  if (exclusionCoveringNotesFolder(managedFolderPath, [normalized])) {
    return false;
  }
  return !isPathInManagedFolder(vaultFolderPath(normalized), managedFolderPath);
}

export function excludedNotesFolderMessage(
  managedFolderPath: string,
  excludedFolderPath: string,
): string {
  return `Tasks Eye can't read the notes folder "${normalizeManagedFolderPath(
    managedFolderPath,
  )}" because the excluded folder "${normalizeExcludedFolderPath(
    excludedFolderPath,
  )}" covers it. Remove that exclusion or choose another folder in settings.`;
}

export function exclusionCoversNotesFolderMessage(
  managedFolderPath: string,
): string {
  return `Excluding this folder would hide every note because it contains the notes folder "${normalizeManagedFolderPath(
    managedFolderPath,
  )}".`;
}

export function notesFolderInsideExclusionMessage(
  excludedFolderPath: string,
): string {
  return `This folder is inside the excluded folder "${normalizeExcludedFolderPath(
    excludedFolderPath,
  )}". Remove that exclusion first.`;
}

export const DUPLICATE_EXCLUSION_MESSAGE = "This folder is already excluded.";

export function excludedFolderError(
  value: string,
  index: number,
  managedFolderPath: string,
  excludedFolderPaths: readonly string[],
): string | null {
  const normalized = normalizeExcludedFolderPath(value);
  if (normalized === "") return null;
  if (exclusionCoveringNotesFolder(managedFolderPath, [normalized])) {
    return exclusionCoversNotesFolderMessage(managedFolderPath);
  }
  const duplicate = excludedFolderPaths.some(
    (existing, existingIndex) =>
      existingIndex !== index &&
      normalizeExcludedFolderPath(existing) === normalized,
  );
  return duplicate ? DUPLICATE_EXCLUSION_MESSAGE : null;
}

export function notesFolderExclusionError(
  managedFolderPath: string,
  excludedFolderPaths: readonly string[],
): string | null {
  const covering = exclusionCoveringNotesFolder(
    managedFolderPath,
    excludedFolderPaths,
  );
  return covering ? notesFolderInsideExclusionMessage(covering) : null;
}
export const MISSING_EXCLUSION_WARNING =
  "Folder not found; this exclusion has no effect until it exists.";
export const OUTSIDE_EXCLUSION_NOTE =
  "Outside the notes folder; this exclusion has no effect.";
