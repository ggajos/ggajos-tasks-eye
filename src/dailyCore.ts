import { getContextFromPath } from "./context";
import type { EyeFile } from "./types";

const TEMPLATE_LINK = "[[T99 - System - Daily Note|Template]]";
const DAILY_NAME = /^(\d{4}-\d{2}-\d{2})\b/;

export interface CompletedTask {
  text: string;
  context: string;
  fileName: string;
  filePath: string;
}

export interface Neighbors {
  prev?: string;
  next?: string;
}

export function datePrefix(name: string): string | null {
  const match = name.match(DAILY_NAME);
  return match?.[1] ?? null;
}

export function cleanCompletedTaskText(text: string): string {
  return text
    .replace(/\s*✅\s*\d{4}-\d{2}-\d{2}.*$/, "")
    .replace(/#[\w/-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function collectCompletedTasks(
  files: Iterable<EyeFile>,
  date: string,
): CompletedTask[] {
  const result: CompletedTask[] = [];

  for (const file of files) {
    for (const task of file.tasks) {
      if (task.completed && task.text.includes(`✅ ${date}`)) {
        result.push({
          text: cleanCompletedTaskText(task.text),
          context: getContextFromPath(file.path),
          fileName: file.basename,
          filePath: file.path,
        });
      }
    }
  }

  return result;
}

export function groupCompletedTasks(
  tasks: CompletedTask[],
): Record<string, Record<string, CompletedTask[]>> {
  const grouped: Record<string, Record<string, CompletedTask[]>> = {};

  for (const task of tasks) {
    const context = task.context || "-";
    grouped[context] ??= {};
    grouped[context][task.fileName] ??= [];
    grouped[context][task.fileName]!.push(task);
  }

  return grouped;
}

export function formatCompletedMarkdown(
  grouped: Record<string, Record<string, CompletedTask[]>>,
): string[] {
  const lines: string[] = [];

  for (const context of Object.keys(grouped).sort()) {
    lines.push(`- ${context}`);
    const files = grouped[context] ?? {};
    for (const [fileName, tasks] of Object.entries(files).sort()) {
      lines.push(`\t- [[${fileName}]]`);
      for (const task of tasks) lines.push(`\t\t- ✅ ${task.text}`);
    }
  }

  return lines;
}

export function pickNeighbors(noteNames: string[], date: string): Neighbors {
  let prev: string | undefined;
  let next: string | undefined;

  for (const name of noteNames) {
    const d = datePrefix(name);
    if (d === null) continue;

    if (d < date) {
      if (prev === undefined || d > (datePrefix(prev) as string)) prev = name;
    } else if (d > date) {
      if (next === undefined || d < (datePrefix(next) as string)) next = name;
    }
  }

  return { prev, next };
}

export function formatNavMarkdown(neighbors: Neighbors): string {
  const parts: string[] = [];

  if (neighbors.prev) {
    parts.push(`[[${neighbors.prev}|‹ ${datePrefix(neighbors.prev)}]]`);
  }

  parts.push(TEMPLATE_LINK);

  if (neighbors.next) {
    parts.push(`[[${neighbors.next}|${datePrefix(neighbors.next)} ›]]`);
  }

  return parts.join(" | ");
}
