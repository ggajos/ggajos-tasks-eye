import type { App } from "obsidian";
import { Notice, TFile } from "obsidian";
import { fileNotFoundMessage, taskUpdateFailedMessage } from "./constants";
import { replaceTaskLine, shiftTaskDueInMarkdown } from "./taskParsing";
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

export async function shiftTaskDueInFile(
  app: App,
  filePath: string,
  task: EyeTask,
  deltaDays: number,
): Promise<void> {
  await updateMarkdownFile(app, filePath, (markdown) =>
    shiftTaskDueInMarkdown(markdown, task, deltaDays),
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
  await updateMarkdownFile(app, filePath, (markdown) =>
    replaceTaskLine(markdown, task, replacement),
  );
}
