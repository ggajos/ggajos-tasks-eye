import type {
  Editor,
  EditorChange,
  EditorPosition,
  EditorSelection,
} from "obsidian";

const CHECKED_TASK_RE = /^(\s*[-*+]\s+\[)[xX](\])/;
const COMPLETION_MARKER_RE = /\s*✅\s*\d{4}-\d{2}-\d{2}/g;

export type TaskLineUnchecker = (line: string) => string;

export function uncheckTaskLine(line: string): string {
  if (!isCheckedTaskLine(line)) return line;
  return line
    .replace(CHECKED_TASK_RE, "$1 $2")
    .replace(COMPLETION_MARKER_RE, "")
    .trimEnd();
}

export function isCheckedTaskLine(line: string): boolean {
  return CHECKED_TASK_RE.test(line);
}

function comparePositions(a: EditorPosition, b: EditorPosition): number {
  if (a.line !== b.line) return a.line - b.line;
  return a.ch - b.ch;
}

function orderedSelection(selection: EditorSelection): {
  from: EditorPosition;
  to: EditorPosition;
} {
  return comparePositions(selection.anchor, selection.head) <= 0
    ? { from: selection.anchor, to: selection.head }
    : { from: selection.head, to: selection.anchor };
}

export function lineNumbersTouchedBySelections(
  selections: readonly EditorSelection[],
  lastLine: number,
): number[] {
  const lines = new Set<number>();

  for (const selection of selections) {
    const { from, to } = orderedSelection(selection);
    let endLine = to.line;
    if (to.ch === 0 && to.line > from.line) endLine--;

    const start = Math.max(0, Math.min(from.line, lastLine));
    const end = Math.max(0, Math.min(endLine, lastLine));
    for (let line = start; line <= end; line++) lines.add(line);
  }

  return Array.from(lines).sort((a, b) => a - b);
}

function changesForLines(
  editor: Editor,
  lines: readonly number[],
  uncheckLine: TaskLineUnchecker,
): EditorChange[] {
  const changes: EditorChange[] = [];
  for (const line of lines) {
    const original = editor.getLine(line);
    if (!isCheckedTaskLine(original)) continue;

    const updated = uncheckLine(original);
    if (updated === original) continue;

    changes.push({
      from: { line, ch: 0 },
      to: { line, ch: original.length },
      text: updated,
    });
  }
  return changes;
}

export function getUncheckSelectedTaskChanges(
  editor: Editor,
  uncheckLine: TaskLineUnchecker = uncheckTaskLine,
): EditorChange[] {
  const lines = lineNumbersTouchedBySelections(
    editor.listSelections(),
    editor.lastLine(),
  );
  return changesForLines(editor, lines, uncheckLine);
}

export function canUncheckSelectedTasks(editor: Editor): boolean {
  return getUncheckSelectedTaskChanges(editor).length > 0;
}

export function uncheckSelectedTasks(
  editor: Editor,
  uncheckLine: TaskLineUnchecker = uncheckTaskLine,
): boolean {
  const changes = getUncheckSelectedTaskChanges(editor, uncheckLine);
  if (changes.length === 0) return false;

  editor.transaction({ changes }, "ggajos-tasks-eye-uncheck-selected-tasks");
  return true;
}
