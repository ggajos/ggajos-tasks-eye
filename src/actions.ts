import { Notice, TFile } from "obsidian";
import type { App } from "obsidian";
import {
  replaceTaskLine,
  shiftTaskDueInMarkdown,
} from "./taskParsing";
import type { TasksApiV1 } from "./tasksApi";
import type { EyeTask } from "./types";

function findMarkdownFile(app: App, path: string): TFile | null {
  const file = app.vault.getAbstractFileByPath(path);
  return file instanceof TFile ? file : null;
}

async function processTaskLine(
  app: App,
  filePath: string,
  task: EyeTask,
  replacement: string,
): Promise<void> {
  const file = findMarkdownFile(app, filePath);
  if (!file) {
    new Notice(`Tasks Eye: file not found: ${filePath}`);
    return;
  }

  await app.vault.process(file, (markdown) =>
    replaceTaskLine(markdown, task, replacement)
  );
}

export async function shiftTaskDueInFile(
  app: App,
  filePath: string,
  task: EyeTask,
  deltaDays: number,
): Promise<void> {
  const file = findMarkdownFile(app, filePath);
  if (!file) {
    new Notice(`Tasks Eye: file not found: ${filePath}`);
    return;
  }

  await app.vault.process(file, (markdown) =>
    shiftTaskDueInMarkdown(markdown, task, deltaDays)
  );
}

export async function completeTaskInFile(
  app: App,
  tasksApi: TasksApiV1,
  filePath: string,
  task: EyeTask,
): Promise<void> {
  const replacement = tasksApi.executeToggleTaskDoneCommand(
    task.lineText,
    filePath,
  );
  await processTaskLine(app, filePath, task, replacement);
}
