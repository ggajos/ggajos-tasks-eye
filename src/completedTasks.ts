import { getContextFromPath } from "./context";
import type { EyeFile } from "./types";

export interface CompletedTask {
  text: string;
  context: string;
  fileName: string;
  filePath: string;
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
