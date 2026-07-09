import {
  Notice,
  Plugin,
  TFile,
} from "obsidian";
import type {
  Editor,
  MarkdownFileInfo,
  MarkdownView,
  TAbstractFile,
  WorkspaceLeaf,
} from "obsidian";
import {
  completeTaskInFile,
  shiftTaskDueInFile,
} from "./actions";
import {
  isEyeMode,
  MODES,
  NOTES_FOLDER_PATH,
  TIMELINE_FOLDER_PATH,
} from "./constants";
import type { EyeMode } from "./constants";
import {
  CompletedTasksView,
  COMPLETED_VIEW_TYPE,
  dateFromDailyPath,
} from "./completedView";
import { discoverContexts, matchesContextFilter } from "./context";
import { renderDailyCompletedBlock } from "./daily";
import { todayIso } from "./date";
import {
  canUncheckSelectedTasks,
  uncheckSelectedTasks,
} from "./editorUncheck";
import { readEyeFiles } from "./indexer";
import { openNewEyeNoteFlow } from "./newNote";
import { getTasksApi } from "./tasksApi";
import type { TasksApiV1 } from "./tasksApi";
import type { EyeFile, EyeSettings, RowModel } from "./types";
import { EyeView, VIEW_TYPE } from "./view";
import { MODE_COMMAND_SHORTCUTS, COMMAND_SHORTCUTS } from "../features/commands";

const DEFAULT_SETTINGS: EyeSettings = {
  mode: "open",
  contextFilter: "*",
};

function isRelevantFile(file: TAbstractFile): boolean {
  return file.path.startsWith(`${NOTES_FOLDER_PATH}/`);
}

function isTimelineFile(file: TAbstractFile): boolean {
  return file.path.startsWith(`${TIMELINE_FOLDER_PATH}/`);
}

export default class TheEyePlugin extends Plugin {
  settings: EyeSettings = DEFAULT_SETTINGS;
  private refreshTimer: number | null = null;

  async onload(): Promise<void> {
    const saved = await this.loadData() as Partial<EyeSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(saved ?? {}),
    };
    if (!isEyeMode(this.settings.mode)) this.settings.mode = "open";
    if (!this.settings.contextFilter) this.settings.contextFilter = "*";

    this.registerView(VIEW_TYPE, (leaf) => new EyeView(leaf, this));
    this.registerView(
      COMPLETED_VIEW_TYPE,
      (leaf) => new CompletedTasksView(leaf, this),
    );

    this.addRibbonIcon("eye", "Open Tasks Eye", () => {
      void this.openEye(this.settings.mode);
    });
    this.addRibbonIcon("check-check", "Open Tasks Eye Done", () => {
      void this.openCompletedTasks();
    });

    for (const mode of MODES) {
      this.addCommand({
        id: `open-${mode}`,
        name: `Open Tasks Eye: ${mode}`,
        hotkeys: [MODE_COMMAND_SHORTCUTS[mode].hotkey],
        callback: () => {
          void this.openEye(mode);
        },
      });
    }

    this.addCommand({
      id: "create-new-note",
      name: "Create new Tasks Eye note",
      callback: () => {
        openNewEyeNoteFlow(this.app);
      },
    });
    this.addCommand({
      id: "open-completed-tasks",
      name: "Open Tasks Eye Done",
      hotkeys: [COMMAND_SHORTCUTS.find((command) =>
        command.commandId === "open-completed-tasks"
      )!.hotkey],
      callback: () => {
        void this.openCompletedTasks();
      },
    });
    this.addCommand({
      id: "uncheck-selected-tasks",
      name: "Uncheck selected tasks",
      hotkeys: [COMMAND_SHORTCUTS.find((command) =>
        command.commandId === "uncheck-selected-tasks"
      )!.hotkey],
      editorCheckCallback: (checking, editor, ctx) => {
        if (!canUncheckSelectedTasks(editor)) return false;
        if (!checking) this.uncheckSelectedTasksInEditor(editor, ctx);
        return true;
      },
    });

    for (const blockName of [
      "ggajos-tasks-eye-daily-completed",
      "obsidian-tasks-eye-daily-completed",
      "eye-daily-completed",
    ] as const) {
      this.registerMarkdownCodeBlockProcessor(
        blockName,
        async (source, el, ctx) => {
          await renderDailyCompletedBlock(
            this.app,
            source,
            el,
            ctx.sourcePath,
            this,
          );
        },
      );
    }

    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      if (isRelevantFile(file) || isTimelineFile(file)) this.queueRefresh();
    }));
    this.registerEvent(this.app.vault.on("create", (file) => {
      if (isRelevantFile(file) || isTimelineFile(file)) this.queueRefresh();
    }));
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (isRelevantFile(file) || isTimelineFile(file)) this.queueRefresh();
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (isRelevantFile(file) || isTimelineFile(file)) this.queueRefresh();
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (
        isRelevantFile(file) ||
        isTimelineFile(file) ||
        oldPath.startsWith(`${NOTES_FOLDER_PATH}/`) ||
        oldPath.startsWith(`${TIMELINE_FOLDER_PATH}/`)
      ) {
        this.queueRefresh();
      }
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
      void this.syncCompletedViewsToActiveDaily();
    }));
    if (!this.tasksApiAvailable()) {
      new Notice("Tasks Eye requires the Obsidian Tasks plugin API.");
    }
  }

  onunload(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  tasksApiAvailable(): boolean {
    return getTasksApi(this.app) !== null;
  }

  getTasksApi(): TasksApiV1 | null {
    const api = getTasksApi(this.app);
    if (!api) {
      new Notice("Tasks Eye requires the Obsidian Tasks plugin API.");
    }
    return api;
  }

  async readFiles(): Promise<EyeFile[]> {
    return await readEyeFiles(this.app);
  }

  discoverContexts(files: EyeFile[]): string[] {
    return discoverContexts(files);
  }

  matchesContextFilter(path: string): boolean {
    return matchesContextFilter(path, this.settings.contextFilter);
  }

  async setMode(mode: EyeMode): Promise<void> {
    this.settings.mode = mode;
    await this.saveData(this.settings);
  }

  async setContextFilter(contextFilter: string): Promise<void> {
    this.settings.contextFilter = contextFilter || "*";
    await this.saveData(this.settings);
  }

  async openEye(mode: EyeMode): Promise<void> {
    await this.setMode(mode);
    const leaf = this.findLeaf() ?? this.app.workspace.getLeaf(true);
    await leaf.setViewState({
      type: VIEW_TYPE,
      active: true,
      state: { mode },
    });
    await this.app.workspace.revealLeaf(leaf);

    if (leaf.view instanceof EyeView) {
      await leaf.view.setMode(mode);
    }
  }

  async openCompletedTasks(date?: string): Promise<void> {
    const activeDaily = this.activeDailyDate();
    const viewDate = date ?? activeDaily ?? todayIso();
    const leaf = this.findCompletedLeaf() ?? this.app.workspace.getLeaf(true);
    await leaf.setViewState({
      type: COMPLETED_VIEW_TYPE,
      active: true,
      state: { date: viewDate },
    });
    await this.app.workspace.revealLeaf(leaf);

    if (leaf.view instanceof CompletedTasksView) {
      await leaf.view.setDate(viewDate);
    }
  }

  async openFile(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`Tasks Eye: file not found: ${path}`);
      return;
    }
    await this.app.workspace.getLeaf(false).openFile(file);
  }

  async shiftTaskDue(model: RowModel, deltaDays: number): Promise<void> {
    if (!model.earliestTask) return;
    await shiftTaskDueInFile(
      this.app,
      model.file.path,
      model.earliestTask,
      deltaDays,
    );
    this.queueRefresh();
  }

  async completeTask(model: RowModel): Promise<void> {
    if (!model.earliestTask) return;
    const api = this.getTasksApi();
    if (!api) return;
    await completeTaskInFile(this.app, api, model.file.path, model.earliestTask);
    this.queueRefresh();
  }

  private uncheckSelectedTasksInEditor(
    editor: Editor,
    ctx: MarkdownView | MarkdownFileInfo,
  ): boolean {
    const api = this.getTasksApi();
    if (!api) return uncheckSelectedTasks(editor);

    const filePath = ctx.file?.path ?? "";
    return uncheckSelectedTasks(editor, (line) =>
      api.executeToggleTaskDoneCommand(line, filePath),
    );
  }

  private findLeaf(): WorkspaceLeaf | null {
    return this.app.workspace.getLeavesOfType(VIEW_TYPE)[0] ?? null;
  }

  private findCompletedLeaf(): WorkspaceLeaf | null {
    return this.app.workspace.getLeavesOfType(COMPLETED_VIEW_TYPE)[0] ?? null;
  }

  private queueRefresh(): void {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refreshOpenViews();
    }, 150);
  }

  private async refreshOpenViews(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof EyeView) await leaf.view.requestRender();
    }

    const completedLeaves = this.app.workspace.getLeavesOfType(
      COMPLETED_VIEW_TYPE,
    );
    for (const leaf of completedLeaves) {
      if (leaf.view instanceof CompletedTasksView) {
        await leaf.view.requestRender();
      }
    }
  }

  private activeDailyDate(): string | null {
    const file = this.app.workspace.getActiveFile();
    if (!file || !file.path.startsWith(`${TIMELINE_FOLDER_PATH}/`)) {
      return null;
    }
    return dateFromDailyPath(file.path);
  }

  private async syncCompletedViewsToActiveDaily(): Promise<void> {
    const date = this.activeDailyDate();
    if (!date) return;

    const completedLeaves = this.app.workspace.getLeavesOfType(
      COMPLETED_VIEW_TYPE,
    );
    for (const leaf of completedLeaves) {
      if (leaf.view instanceof CompletedTasksView) {
        await leaf.view.setDate(date);
      }
    }
  }
}
