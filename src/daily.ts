import { MarkdownRenderer } from "obsidian";
import type { App, Component } from "obsidian";
import { NOTES_FOLDER_PATH, TIMELINE_FOLDER_PATH } from "./constants";
import {
  collectCompletedTasks,
  datePrefix,
  formatCompletedMarkdown,
  formatNavMarkdown,
  groupCompletedTasks,
  pickNeighbors,
} from "./dailyCore";
import { readEyeFiles } from "./indexer";

function dateFromSource(source: string, sourcePath: string): string | null {
  const trimmed = source.trim();
  const direct = trimmed.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (direct) return direct[1] ?? null;

  const pathName = sourcePath.split("/").pop() ?? "";
  return datePrefix(pathName);
}

function timelineNoteNames(app: App): string[] {
  return app.vault.getMarkdownFiles()
    .filter((file) => file.path.startsWith(`${TIMELINE_FOLDER_PATH}/`))
    .map((file) => file.basename);
}

async function renderMarkdown(
  app: App,
  markdown: string,
  el: HTMLElement,
  sourcePath: string,
  component: Component,
): Promise<void> {
  await MarkdownRenderer.render(app, markdown, el, sourcePath, component);
}

export async function renderDailyCompletedBlock(
  app: App,
  source: string,
  el: HTMLElement,
  sourcePath: string,
  component: Component,
): Promise<void> {
  const date = dateFromSource(source, sourcePath);
  if (!date) {
    const message = document.createElement("div");
    message.textContent = "Tasks Eye: missing daily date";
    el.appendChild(message);
    return;
  }

  const nav = formatNavMarkdown(pickNeighbors(timelineNoteNames(app), date));
  const files = await readEyeFiles(app);
  const lines = formatCompletedMarkdown(
    groupCompletedTasks(collectCompletedTasks(files, date)),
  );

  const markdown = lines.length === 0
    ? `${nav}\n\nNo completed tasks today`
    : `${nav}\n\n${lines.join("\n")}`;

  await renderMarkdown(
    app,
    markdown,
    el,
    sourcePath || NOTES_FOLDER_PATH,
    component,
  );
}
