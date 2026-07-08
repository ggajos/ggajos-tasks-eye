import type { App, TFile } from "obsidian";
import { NOTES_FOLDER_PATH } from "./constants";
import { parseTasksFromMarkdown } from "./taskParsing";
import type { EyeFile } from "./types";

type Frontmatter = Record<string, unknown>;

function basenameFromPath(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.replace(/\.md$/i, "");
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return trimmed.replace(/^["']|["']$/g, "");
}

export function parseFrontmatter(markdown: string): Frontmatter {
  const normalized = markdown.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/);
  if (lines[0] !== "---") return {};

  const end = lines.findIndex((line, index) => index > 0 && line === "---");
  if (end < 0) return {};

  const result: Frontmatter = {};
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) result[match[1]!] = parseScalar(match[2] ?? "");
  }
  return result;
}

export function buildEyeFileFromMarkdown(
  path: string,
  markdown: string,
  frontmatter: Frontmatter = parseFrontmatter(markdown),
): EyeFile {
  const name = path.split("/").pop() ?? path;
  return {
    path,
    name,
    basename: basenameFromPath(path),
    status: frontmatter.status,
    tasks: parseTasksFromMarkdown(markdown),
  };
}

function isManagedMarkdown(file: TFile): boolean {
  return file.extension === "md" && file.path.startsWith(`${NOTES_FOLDER_PATH}/`);
}

export async function readEyeFiles(app: App): Promise<EyeFile[]> {
  const files = app.vault.getMarkdownFiles().filter(isManagedMarkdown);
  const result: EyeFile[] = [];

  for (const file of files) {
    const markdown = await app.vault.cachedRead(file);
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter ??
      parseFrontmatter(markdown);
    result.push(buildEyeFileFromMarkdown(file.path, markdown, frontmatter));
  }

  return result.sort((a, b) => a.path.localeCompare(b.path));
}
