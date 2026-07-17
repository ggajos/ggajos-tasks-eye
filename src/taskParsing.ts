import { isoToTs, shiftIsoDate } from "./date";
import type { EyeTask } from "./types";

const TASK_LINE_RE = /^(\s*[-*+]\s+\[([^\]])\]\s*)(.*)$/;
const DUE_RE = /(📅\s*)(\d{4}-\d{2}-\d{2})/;

export function parseTaskLine(
  line: string,
  lineNumber: number,
): EyeTask | null {
  const match = line.match(TASK_LINE_RE);
  if (!match) return null;

  const marker = match[2] ?? "";
  const text = match[3] ?? "";
  const due = text.match(DUE_RE);
  const dueIso = due?.[2] ?? null;

  return {
    completed: marker !== " ",
    text,
    dueTs: dueIso ? isoToTs(dueIso) : null,
    dueIso,
    line: lineNumber,
    lineText: line,
  };
}

export function parseTasksFromMarkdown(markdown: string): EyeTask[] {
  const lines = markdown.split("\n");
  const tasks: EyeTask[] = [];
  for (let i = 0; i < lines.length; i++) {
    const task = parseTaskLine(lines[i] ?? "", i);
    if (task) tasks.push(task);
  }
  return tasks;
}

export function shiftDueDateInText(text: string, deltaDays: number): string {
  const match = text.match(DUE_RE);
  if (!match) return text;
  return text.replace(DUE_RE, `$1${shiftIsoDate(match[2]!, deltaDays)}`);
}

export function stripDueDate(text: string): string {
  return text
    .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "")
    .replace(/ðŸ\S*\s*\d{4}-\d{2}-\d{2}/g, "")
    .replace(/ð\S*/g, "")
    .replace(/\s+\d{4}-\d{2}-\d{2}$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function replacementLines(replacement: string): string[] {
  return replacement.split("\n");
}

function findTaskLine(lines: string[], task: EyeTask): number {
  const target = task.line;
  if (target >= 0 && target < lines.length && lines[target] === task.lineText) {
    return target;
  }

  const targetLine = lines[target];
  if (target >= 0 && target < lines.length && targetLine?.includes(task.text)) {
    return target;
  }

  return lines.findIndex(
    (line) => TASK_LINE_RE.test(line) && line.includes(task.text),
  );
}

export function replaceTaskLine(
  markdown: string,
  task: EyeTask,
  replacement: string,
): string {
  const lines = markdown.split("\n");
  const idx = findTaskLine(lines, task);
  if (idx < 0) return markdown;

  lines.splice(idx, 1, ...replacementLines(replacement));
  return lines.join("\n");
}

export function shiftTaskDueInMarkdown(
  markdown: string,
  task: EyeTask,
  deltaDays: number,
): string {
  const shifted = shiftDueDateInText(task.lineText, deltaDays);
  return replaceTaskLine(markdown, task, shifted);
}
