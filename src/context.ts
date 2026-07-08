import { NOTES_FOLDER_PATH } from "./constants";

export const VACATION_CONTEXT = "ooo";

export function getTopLevelContext(filePath: string): string {
  const folderPath = filePath.replace(/\/[^/]+$/, "");
  if (!folderPath.startsWith(NOTES_FOLDER_PATH)) return "-";

  const normalized = folderPath.slice(NOTES_FOLDER_PATH.length).replace(
    /^\//,
    "",
  );
  if (!normalized) return "-";

  const firstSegment = normalized.split("/")[0] ?? "";
  return firstSegment.replace(/^\d+\s+/, "").toLowerCase().trim() || "-";
}

export function matchesContextFilter(filePath: string, filter: string): boolean {
  if (!filter || filter === "*") return true;
  return getContextFromPath(filePath) === filter;
}

export function getContextFromFolderPath(folderPath: string): string {
  if (
    folderPath !== NOTES_FOLDER_PATH &&
    !folderPath.startsWith(`${NOTES_FOLDER_PATH}/`)
  ) {
    return "-";
  }

  const normalized = folderPath.replace(
    new RegExp(`^${NOTES_FOLDER_PATH}/?`, "i"),
    "",
  );

  if (!normalized) return "-";

  const parts = normalized
    .split("/")
    .map((segment) =>
      segment
        .replace(/^\d+\s+/, "")
        .toLowerCase()
        .trim()
    )
    .filter(Boolean);

  if (parts.length === 0) return "-";
  if (parts.length === 1) return parts[0] ?? "-";

  const abbreviated = parts.slice(0, -1).map((p) => p.charAt(0));
  const leaf = parts[parts.length - 1] ?? "-";
  return [...abbreviated, leaf].join("/");
}

export function getContextFromPath(filePath: string): string {
  return getContextFromFolderPath(filePath.replace(/\/[^/]+$/, ""));
}

export function discoverContexts(
  files: { path: string }[],
): string[] {
  const contexts = new Set<string>();
  for (const file of files) {
    const ctx = getContextFromPath(file.path);
    if (ctx !== "-") contexts.add(ctx);
  }
  return Array.from(contexts).sort();
}

export function withVacationContext(contexts: readonly string[]): string[] {
  return Array.from(new Set([...contexts, VACATION_CONTEXT])).sort();
}

export function formatContextLabel(context: string): string {
  if (context === VACATION_CONTEXT) return "OOO";
  if (context === "-") return context;
  return context
    .split("/")
    .map((part) => {
      if (part.length <= 2 || /^\d+[a-z]+$/i.test(part)) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("/");
}

export function normalizeContextFilter(
  contextFilter: string,
  contexts: readonly string[],
): string {
  if (!contextFilter || contextFilter === "*") return "*";
  return contexts.includes(contextFilter) ? contextFilter : "*";
}
