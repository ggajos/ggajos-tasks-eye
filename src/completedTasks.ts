import { getContextForFile } from "./context";
import { stripPrioritySignifier } from "./priority";
import type { EyeFile, EyeTask } from "./types";

export interface StatusTaskNode {
  task: EyeTask;
  matched: boolean;
  completed: boolean;
  future: boolean;
  text: string;
  children: StatusTaskNode[];
}

export interface StatusNoteGroup {
  context: string;
  fileName: string;
  filePath: string;
  nodes: StatusTaskNode[];
  matchedCount: number;
}

export function cleanCompletedTaskText(text: string): string {
  return stripPrioritySignifier(
    text
      .replace(/\s*✅\s*\d{4}-\d{2}-\d{2}.*$/, "")
      .replace(/#[\w/-]+/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function isCompletedOnDate(task: EyeTask, date: string): boolean {
  return task.completed && task.text.includes(`✅ ${date}`);
}

function isUnfinishedWithDueDate(task: EyeTask): boolean {
  return !task.completed && task.dueTs !== null;
}

interface RawNode {
  task: EyeTask;
  children: RawNode[];
}

function buildForest(tasks: EyeTask[]): RawNode[] {
  const roots: RawNode[] = [];
  const stack: RawNode[] = [];

  for (const task of tasks) {
    const node: RawNode = { task, children: [] };
    while (
      stack.length > 0 &&
      stack[stack.length - 1]!.task.indent >= task.indent
    ) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push(node);
  }

  return roots;
}

function pruneNode(
  node: RawNode,
  date: string,
  showFuture: boolean,
): StatusTaskNode | null {
  const children = node.children
    .map((child) => pruneNode(child, date, showFuture))
    .filter((child): child is StatusTaskNode => child !== null);

  const completed = isCompletedOnDate(node.task, date);
  const future = showFuture && isUnfinishedWithDueDate(node.task);
  const matched = completed || future;

  if (!matched && children.length === 0) return null;

  return {
    task: node.task,
    matched,
    completed,
    future,
    text: cleanCompletedTaskText(node.task.text),
    children,
  };
}

function countMatched(nodes: StatusTaskNode[]): number {
  return nodes.reduce(
    (sum, node) => sum + (node.matched ? 1 : 0) + countMatched(node.children),
    0,
  );
}

export function collectStatusGroups(
  files: Iterable<EyeFile>,
  date: string,
  showFuture: boolean,
): Record<string, StatusNoteGroup[]> {
  const grouped: Record<string, StatusNoteGroup[]> = {};
  const indexedFiles = Array.from(files);

  for (const file of indexedFiles) {
    const hasCompletionOnDate = file.tasks.some((task) =>
      isCompletedOnDate(task, date),
    );
    const futureAllowed = showFuture && hasCompletionOnDate;

    const nodes = buildForest(file.tasks)
      .map((node) => pruneNode(node, date, futureAllowed))
      .filter((node): node is StatusTaskNode => node !== null);

    const matchedCount = countMatched(nodes);
    if (matchedCount === 0) continue;

    const context = getContextForFile(file, indexedFiles);
    grouped[context] ??= [];
    const bucket = grouped[context];
    bucket.push({
      context,
      fileName: file.basename,
      filePath: file.path,
      nodes,
      matchedCount,
    });
  }

  return grouped;
}

export function groupMatchedCount(groups: StatusNoteGroup[]): number {
  return groups.reduce((sum, group) => sum + group.matchedCount, 0);
}
