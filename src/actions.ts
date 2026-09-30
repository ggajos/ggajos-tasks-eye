import type { App } from "obsidian";
import { Notice, TFile } from "obsidian";
import { fileNotFoundMessage, taskUpdateFailedMessage } from "./constants";
import type { PriorityDirection } from "./priority";
import {
  replaceTaskLine,
  setTaskPriorityInMarkdown,
  shiftTaskDueInMarkdown,
} from "./taskParsing";
import type { TasksApiV1 } from "./tasksApi";
import type { EyeTask } from "./types";

function findMarkdownFile(app: App, path: string): TFile | null {
  const file = app.vault.getAbstractFileByPath(path);
  return file instanceof TFile ? file : null;
}

async function updateMarkdownFile(
  app: App,
  filePath: string,
  transform: (markdown: string) => string,
): Promise<void> {
  const file = findMarkdownFile(app, filePath);
  if (!file) {
    new Notice(fileNotFoundMessage(filePath));
    return;
  }

  try {
    await app.vault.process(file, transform);
  } catch (error) {
    console.error(
      `Tasks Eye failed to update the task in "${filePath}".`,
      error,
    );
    new Notice(taskUpdateFailedMessage(filePath));
  }
}

/** One user-triggered change to a single task line. */
export type TaskEdit =
  | { kind: "done" }
  | { kind: "shift"; days: number }
  | { kind: "priority"; direction: PriorityDirection };

export interface TaskEditDeps {
  /** Resolves the Tasks API, needed only to complete a task. */
  tasksApi?: () => TasksApiV1 | null;
}

function lineTransform(
  filePath: string,
  task: EyeTask,
  edit: TaskEdit,
  deps: TaskEditDeps,
): ((markdown: string) => string) | null {
  switch (edit.kind) {
    case "shift":
      return (markdown) => shiftTaskDueInMarkdown(markdown, task, edit.days);
    case "priority":
      return (markdown) =>
        setTaskPriorityInMarkdown(markdown, task, edit.direction);
    case "done": {
      const api = deps.tasksApi?.() ?? null;
      if (!api) return null;
      const replacement = api.executeToggleTaskDoneCommand(
        task.lineText,
        filePath,
      );
      return (markdown) => replaceTaskLine(markdown, task, replacement);
    }
  }
}

/**
 * Apply `edit` to `task` in the note at `filePath`. Missing files and write
 * failures are reported to the user, never thrown. Returns false when the
 * edit could not be attempted (e.g. completing without the Tasks API).
 */
export async function editTaskInFile(
  app: App,
  filePath: string,
  task: EyeTask,
  edit: TaskEdit,
  deps: TaskEditDeps = {},
): Promise<boolean> {
  const transform = lineTransform(filePath, task, edit, deps);
  if (!transform) return false;
  await updateMarkdownFile(app, filePath, transform);
  return true;
}
