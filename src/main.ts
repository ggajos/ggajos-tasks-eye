import {
  Notice,
  Plugin,
  TFile,
  TFolder,
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
  CREATE_NEW_NOTE_COMMAND,
  MODE_COMMANDS,
  OPEN_COMPLETED_COMMAND,
  UNCHECK_SELECTED_COMMAND,
} from "./commands";
import {
  fileNotFoundMessage,
  isEyeMode,
  TASKS_PLUGIN_REQUIRED_MESSAGE,
} from "./constants";
import type { EyeMode } from "./constants";
import { todayIso } from "./date";
import {
  canUncheckSelectedTasks,
  uncheckSelectedTasks,
} from "./editorUncheck";
import { readEyeFiles } from "./indexer";
import { findManagedFolder } from "./managedFolder";
import {
  DEFAULT_MANAGED_FOLDER_PATH,
  isPathInManagedFolder,
  isPathRelatedToManagedFolder,
  missingManagedFolderMessage,
  normalizeManagedFolderPath,
} from "./managedPath";
import { openNewEyeNoteFlow } from "./newNote";
import { TasksEyeSettingTab } from "./settings";
import { getTasksApi } from "./tasksApi";
import type { TasksApiV1 } from "./tasksApi";
import type { EyeFile, EyeSettings, RowModel } from "./types";
import { EyeView, VIEW_TYPE } from "./view";

const DEFAULT_SETTINGS: EyeSettings = {
  mode: "open",
  contextFilter: "*",
  notesFolderPath: DEFAULT_MANAGED_FOLDER_PATH,
};

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
    this.settings.notesFolderPath = normalizeManagedFolderPath(
      this.settings.notesFolderPath,
    );

    this.registerView(VIEW_TYPE, (leaf) => new EyeView(leaf, this));
    this.addSettingTab(new TasksEyeSettingTab(this.app, this));

    this.addRibbonIcon("eye", "Open Tasks Eye", () => {
      void this.openEye(this.settings.mode);
    });

    for (const mode of Object.keys(MODE_COMMANDS) as Array<
      keyof typeof MODE_COMMANDS
    >) {
      const command = MODE_COMMANDS[mode];
      this.addCommand({
        id: command.id,
        name: command.name,
        hotkeys: [command.hotkey],
        callback: () => {
          void this.openEye(mode);
        },
      });
    }

    this.addCommand({
      id: CREATE_NEW_NOTE_COMMAND.id,
      name: CREATE_NEW_NOTE_COMMAND.name,
      hotkeys: [CREATE_NEW_NOTE_COMMAND.hotkey],
      callback: () => {
        openNewEyeNoteFlow(this.app, this.settings.notesFolderPath);
      },
    });
    this.addCommand({
      id: OPEN_COMPLETED_COMMAND.id,
      name: OPEN_COMPLETED_COMMAND.name,
      hotkeys: [OPEN_COMPLETED_COMMAND.hotkey],
      callback: () => {
        void this.openCompletedTasks();
      },
    });
    this.addCommand({
      id: UNCHECK_SELECTED_COMMAND.id,
      name: UNCHECK_SELECTED_COMMAND.name,
      hotkeys: [UNCHECK_SELECTED_COMMAND.hotkey],
      editorCheckCallback: (checking, editor, ctx) => {
        if (!canUncheckSelectedTasks(editor)) return false;
        if (!checking) this.uncheckSelectedTasksInEditor(editor, ctx);
        return true;
      },
    });

    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      if (this.isRelevantFile(file)) this.queueRefresh();
    }));
    this.registerEvent(this.app.vault.on("create", (file) => {
      if (this.isRelevantFile(file)) this.queueRefresh();
    }));
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (this.isRelevantFile(file)) this.queueRefresh();
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (
        isPathRelatedToManagedFolder(
          file.path,
          this.settings.notesFolderPath,
        )
      ) {
        this.queueRefresh();
      }
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (
        this.isRelevantFile(file) ||
        isPathRelatedToManagedFolder(oldPath, this.settings.notesFolderPath)
      ) {
        this.queueRefresh();
      }
    }));
    if (!this.tasksApiAvailable()) {
      new Notice(TASKS_PLUGIN_REQUIRED_MESSAGE);
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
      new Notice(TASKS_PLUGIN_REQUIRED_MESSAGE);
    }
    return api;
  }

  async readFiles(): Promise<EyeFile[]> {
    return readEyeFiles(this.app, this.settings.notesFolderPath);
  }

  managedFolderError(): string | null {
    return this.managedFolder() === null
      ? missingManagedFolderMessage(this.settings.notesFolderPath)
      : null;
  }

  async setNotesFolderPath(notesFolderPath: string): Promise<void> {
    const normalized = normalizeManagedFolderPath(notesFolderPath);
    if (this.settings.notesFolderPath === normalized) return;
    this.settings.notesFolderPath = normalized;
    this.settings.contextFilter = "*";
    await this.saveData(this.settings);
    await this.refreshViews();
  }

  async setMode(mode: EyeMode): Promise<void> {
    if (this.settings.mode === mode) return;
    this.settings.mode = mode;
    await this.saveData(this.settings);
  }

  async setContextFilter(contextFilter: string): Promise<void> {
    const normalized = contextFilter || "*";
    if (this.settings.contextFilter === normalized) return;
    this.settings.contextFilter = normalized;
    await this.saveData(this.settings);
  }

  async openEye(mode: EyeMode): Promise<void> {
    await this.setMode(mode);
    const existingLeaf = this.findLeaf();
    const leaf = existingLeaf ?? this.app.workspace.getLeaf(false);
    const state: Record<string, unknown> = { mode };
    if (!existingLeaf && mode === "done") {
      state.date = todayIso();
    }
    await leaf.setViewState({
      type: VIEW_TYPE,
      active: true,
      state,
    });
    await this.app.workspace.revealLeaf(leaf);

    if (existingLeaf && leaf.view instanceof EyeView) {
      await leaf.view.setMode(mode);
    }
  }

  async openCompletedTasks(date?: string): Promise<void> {
    await this.setMode("done");
    const viewDate = date ?? todayIso();
    const existingLeaf = this.findLeaf();
    const leaf = existingLeaf ?? this.app.workspace.getLeaf(false);
    await leaf.setViewState({
      type: VIEW_TYPE,
      active: true,
      state: { mode: "done", date: viewDate },
    });
    await this.app.workspace.revealLeaf(leaf);

    if (existingLeaf && leaf.view instanceof EyeView) {
      await leaf.view.setMode("done", viewDate);
    }
  }

  async openFile(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(fileNotFoundMessage(path));
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

  private managedFolder(): TFolder | null {
    return findManagedFolder(this.app, this.settings.notesFolderPath);
  }

  private isRelevantFile(file: TAbstractFile): boolean {
    return isPathInManagedFolder(file.path, this.settings.notesFolderPath);
  }

  private queueRefresh(): void {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refreshViews();
    }, 150);
  }

  private async refreshViews(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof EyeView) await leaf.view.requestRender();
    }
  }
}
