import type { App, TFile } from "obsidian";
import {
  DEFAULT_MANAGED_FOLDER_PATH,
  isPathInManagedFolder,
  normalizeManagedFolderPath,
} from "./managedPath";
import { parseTasksFromMarkdown } from "./taskParsing";
import type { EyeFile } from "./types";

type Frontmatter = Record<string, unknown>;

function basenameFromPath(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.replace(/\.md$/i, "");
}

function unquote(value: string): string {
  const quote = value[0];
  const body = value.slice(1, -1);
  if (quote === '"') {
    return body.replace(/\\(["\\ntr])/g, (_match, escaped: string) => {
      if (escaped === "n") return "\n";
      if (escaped === "t") return "\t";
      if (escaped === "r") return "\r";
      return escaped;
    });
  }
  return body.replace(/''/g, "'");
}

function stripComment(value: string): string {
  const match = value.match(/(^|\s)#/);
  if (!match || match.index === undefined) return value;
  const offset = match.index + (match[1] ?? "").length;
  return value.slice(0, offset).trimEnd();
}

function isQuoted(value: string): boolean {
  return (
    value.length >= 2 &&
    (value[0] === '"' || value[0] === "'") &&
    value[value.length - 1] === value[0]
  );
}

function splitInlineList(body: string): string[] {
  const items: string[] = [];
  let current = "";
  let quote = "";
  for (const char of body) {
    if (quote) {
      current += char;
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ",") {
      items.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim() !== "" || items.length > 0) items.push(current);
  return items;
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  if (isQuoted(trimmed)) return unquote(trimmed);

  const withoutComment = stripComment(trimmed);
  if (withoutComment === "") return null;

  const lowered = withoutComment.toLowerCase();
  if (lowered === "null" || withoutComment === "~") return null;
  if (lowered === "true") return true;
  if (lowered === "false") return false;
  if (/^-?\d+$/.test(withoutComment)) return Number(withoutComment);
  if (/^-?\d*\.\d+$/.test(withoutComment)) return Number(withoutComment);

  return withoutComment;
}

function parseValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const body = trimmed.slice(1, -1).trim();
    if (body === "") return [];
    return splitInlineList(body).map((item) => parseScalar(item));
  }
  return parseScalar(trimmed);
}

const KEY_RE = /^([A-Za-z0-9_-]+):\s*(.*)$/;
const BLOCK_ITEM_RE = /^\s*-\s+(.*)$/;

function isIgnorableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("#");
}

export function parseFrontmatter(markdown: string): Frontmatter {
  const normalized = markdown.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/);
  if (lines[0] !== "---") return {};

  const end = lines.findIndex((line, index) => index > 0 && line === "---");
  if (end < 0) return {};

  const result: Frontmatter = {};
  const body = lines.slice(1, end);
  for (let i = 0; i < body.length; i++) {
    const line = body[i] ?? "";
    if (isIgnorableLine(line)) continue;

    const match = line.match(KEY_RE);
    if (!match) continue;

    const key = match[1]!;
    const rest = match[2] ?? "";

    if (rest.trim() === "") {
      const items: unknown[] = [];
      while (i + 1 < body.length) {
        const next = body[i + 1] ?? "";
        if (next.trim() === "") {
          i++;
          continue;
        }
        const itemMatch = next.match(BLOCK_ITEM_RE);
        if (!itemMatch) break;
        items.push(parseScalar(itemMatch[1] ?? ""));
        i++;
      }
      result[key] = items.length > 0 ? items : null;
      continue;
    }

    result[key] = parseValue(rest);
  }
  return result;
}

export function buildEyeFileFromMarkdown(
  path: string,
  markdown: string,
  frontmatter: Frontmatter = parseFrontmatter(markdown),
  managedFolderPath = DEFAULT_MANAGED_FOLDER_PATH,
): EyeFile {
  const name = path.split("/").pop() ?? path;
  return {
    path,
    name,
    basename: basenameFromPath(path),
    managedFolderPath: normalizeManagedFolderPath(managedFolderPath),
    status: frontmatter.status,
    tasks: parseTasksFromMarkdown(markdown),
  };
}

function isManagedMarkdown(file: TFile, managedFolderPath: string): boolean {
  return (
    file.extension === "md" &&
    isPathInManagedFolder(file.path, managedFolderPath)
  );
}

export async function readEyeFiles(
  app: App,
  managedFolderPath: string,
): Promise<EyeFile[]> {
  const files = app.vault
    .getMarkdownFiles()
    .filter((file) => isManagedMarkdown(file, managedFolderPath));
  const result: EyeFile[] = [];

  for (const file of files) {
    const markdown = await app.vault.cachedRead(file);
    const frontmatter =
      app.metadataCache.getFileCache(file)?.frontmatter ??
      parseFrontmatter(markdown);
    result.push(
      buildEyeFileFromMarkdown(
        file.path,
        markdown,
        frontmatter,
        managedFolderPath,
      ),
    );
  }

  return result.sort((a, b) => a.path.localeCompare(b.path));
}
