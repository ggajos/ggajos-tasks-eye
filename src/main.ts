import type {
  Editor,
  MarkdownFileInfo,
  MarkdownView,
  TAbstractFile,
  WorkspaceLeaf,
} from "obsidian";
import { addIcon, Notice, Plugin, TFile } from "obsidian";
import {
  completeTaskInFile,
  setTaskPriorityInFile,
  shiftTaskDueInFile,
} from "./actions";
import {
  MODE_COMMANDS,
  OPEN_COMPLETED_COMMAND,
  OPEN_TREE_COMMAND,
  STATUS_STEP_COMMANDS,
  UNCHECK_SELECTED_COMMAND,
} from "./commands";
import type { EyeMode } from "./constants";
import {
  fileNotFoundMessage,
  TASKS_PLUGIN_REQUIRED_MESSAGE,
} from "./constants";
import { todayIso } from "./date";
import { canUncheckSelectedTasks, uncheckSelectedTasks } from "./editorUncheck";
import { HolidaySyncer } from "./holidaySyncer";
import { readEyeFiles } from "./indexer";
import { findManagedFolder } from "./managedFolder";
import { isPathInSources, isPathRelatedToManagedFolder } from "./managedPath";
import type { StatusStepDirection } from "./noteStatus";
import { stepNoteStatus } from "./noteStatus";
import type { PriorityDirection } from "./priority";
import { TasksEyeSettingTab } from "./settings";
import {
  defaultSettings,
  normalizeSettings,
  SettingsModel,
} from "./settingsModel";
import type { VaultSnapshot } from "./snapshot";
import { createSnapshot, SnapshotCache } from "./snapshot";
import type { TasksApiV1 } from "./tasksApi";
import { getTasksApi } from "./tasksApi";
import { TREE_VIEW_TYPE, TreeView } from "./treeView";
import type { EyeSettings, RowModel } from "./types";
import type { AvailabilityConfig } from "./vacation";
import { availabilityConfigFromSettings } from "./vacation";
import { EyeView, VIEW_TYPE } from "./view";

const ALL_CLEAR_ICON = "ggajos-tasks-eye-circle-check";
const ALL_CLEAR_ICON_SVG = `
  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
  <path d="m7.75 12 2.8 2.8 5.7-5.7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
`;

export default class TheEyePlugin extends Plugin {
  settings: EyeSettings = defaultSettings();
  private settingsTab: TasksEyeSettingTab | null = null;
  private readonly holidays = new HolidaySyncer({
    state: () => this.settings,
    save: () => this.saveData(this.settings),
    dataChanged: () => this.refreshViews(),
    statusChanged: () => this.settingsTab?.update(),
  });
  readonly preferences = new SettingsModel({
    settings: () => this.settings,
    persist: () => this.saveData(this.settings),
    changed: () => this.refreshViews(),
    folderExists: (path) => findManagedFolder(this.app, path) !== null,
  });
  private refreshTimer: number | null = null;
  private readonly snapshots = new SnapshotCache(() => this.loadSnapshot());

  async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
    addIcon(ALL_CLEAR_ICON, ALL_CLEAR_ICON_SVG);

    this.registerView(VIEW_TYPE, (leaf) => new EyeView(leaf, this));
    this.registerView(TREE_VIEW_TYPE, (leaf) => new TreeView(leaf, this));
    this.settingsTab = new TasksEyeSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);

    this.addRibbonIcon("eye", "Open Tasks Eye", () => {
      void this.openEye(this.settings.mode);
    });

    this.addRibbonIcon("list-tree", "Open Tasks Eye tree", () => {
      void this.openTree();
    });

    for (const mode of Object.keys(MODE_COMMANDS) as Array<
      keyof typeof MODE_COMMANDS
    >) {
      const command = MODE_COMMANDS[mode];
      this.addCommand({
        id: command.id,
        name: command.name,
        callback: () => {
          void this.openEye(mode);
        },
      });
    }

    this.addCommand({
      id: OPEN_COMPLETED_COMMAND.id,
      name: OPEN_COMPLETED_COMMAND.name,
      callback: () => {
        void this.openCompletedTasks();
      },
    });
    this.addCommand({
      id: OPEN_TREE_COMMAND.id,
      name: OPEN_TREE_COMMAND.name,
      callback: () => {
        void this.openTree();
      },
    });
    this.addCommand({
      id: UNCHECK_SELECTED_COMMAND.id,
      name: UNCHECK_SELECTED_COMMAND.name,
      editorCheckCallback: (checking, editor, ctx) => {
        if (!canUncheckSelectedTasks(editor)) return false;
        if (!checking) this.uncheckSelectedTasksInEditor(editor, ctx);
        return true;
      },
    });
    for (const direction of Object.keys(
      STATUS_STEP_COMMANDS,
    ) as StatusStepDirection[]) {
      const command = STATUS_STEP_COMMANDS[direction];
      this.addCommand({
        id: command.id,
        name: command.name,
        checkCallback: (checking) => {
          const file = this.app.workspace.getActiveFile();
          if (file?.extension !== "md") return false;
          if (!checking) void this.stepStatus(file, direction);
          return true;
        },
      });
    }

    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.isRelevantFile(file)) this.queueRefresh();
      }),
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (this.isRelevantFile(file)) this.queueRefresh();
      }),
    );
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (this.isRelevantFile(file)) this.queueRefresh();
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (
          isPathRelatedToManagedFolder(file.path, this.settings.notesFolderPath)
        ) {
          this.queueRefresh();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (
          this.isRelevantFile(file) ||
          isPathRelatedToManagedFolder(oldPath, this.settings.notesFolderPath)
        ) {
          this.queueRefresh();
        }
      }),
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        void this.refreshTreeViews();
      }),
    );
    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        void this.refreshTreeViews();
      }),
    );
    if (!this.tasksApiAvailable()) {
      new Notice(TASKS_PLUGIN_REQUIRED_MESSAGE);
    }
    this.holidays.start();
  }

  onunload(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.holidays.stop();
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

  snapshot(): Promise<VaultSnapshot> {
    return this.snapshots.get();
  }

  private async loadSnapshot(): Promise<VaultSnapshot> {
    const files = await readEyeFiles(
      this.app,
      this.settings.notesFolderPath,
      this.settings.excludedFolderPaths,
    );
    // Holiday years depend on the due dates just indexed.
    void this.holidays.refreshYears(false, files, true);
    return createSnapshot(files, this.availabilityConfig());
  }

  availabilityConfig(): AvailabilityConfig {
    return availabilityConfigFromSettings(
      this.settings.availability,
      this.settings.holidayCache,
    );
  }

  holidaySyncStatus(): string {
    return this.holidays.status();
  }

  async refreshHolidayCountries(force = false): Promise<void> {
    await this.holidays.refreshCountries(force);
  }

  async setHolidayCountry(countryCode: string): Promise<void> {
    await this.holidays.setCountry(countryCode);
  }

  // Kept on the Plugin because WDIO scenarios drive them via browser.execute.
  notesFolderSettingError(notesFolderPath: string): string | null {
    return this.preferences.notesFolderSettingError(notesFolderPath);
  }

  excludedFolderSettingError(index: number, value: string): string | null {
    return this.preferences.excludedFolderSettingError(index, value);
  }

  addExcludedFolder(): Promise<void> {
    return this.preferences.addExcludedFolder();
  }

  setExcludedFolder(index: number, value: string): Promise<void> {
    return this.preferences.setExcludedFolder(index, value);
  }

  deleteExcludedFolder(index: number): Promise<void> {
    return this.preferences.deleteExcludedFolder(index);
  }

  setNotesFolderPath(notesFolderPath: string): Promise<void> {
    return this.preferences.setNotesFolderPath(notesFolderPath);
  }

  async openEye(mode: EyeMode): Promise<void> {
    await this.preferences.setMode(mode);
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
    await this.preferences.setMode("done");
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

  async openTree(): Promise<void> {
    const existingLeaf =
      this.app.workspace.getLeavesOfType(TREE_VIEW_TYPE)[0] ?? null;
    const leaf = existingLeaf ?? this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({
      type: TREE_VIEW_TYPE,
      active: true,
    });
    await this.app.workspace.revealLeaf(leaf);
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

  async setTaskPriority(
    model: RowModel,
    direction: PriorityDirection,
  ): Promise<void> {
    if (!model.earliestTask) return;
    await setTaskPriorityInFile(
      this.app,
      model.file.path,
      model.earliestTask,
      direction,
    );
    this.queueRefresh();
  }

  async completeTask(model: RowModel): Promise<void> {
    if (!model.earliestTask) return;
    const api = this.getTasksApi();
    if (!api) return;
    await completeTaskInFile(
      this.app,
      api,
      model.file.path,
      model.earliestTask,
    );
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

  private async stepStatus(
    file: TFile,
    direction: StatusStepDirection,
  ): Promise<void> {
    try {
      await stepNoteStatus(this.app, file, direction);
      if (this.isRelevantFile(file)) this.queueRefresh();
    } catch (error) {
      console.error(
        `Tasks Eye could not step note status (${direction}).`,
        error,
      );
      new Notice(`Tasks Eye: could not change note status.`);
    }
  }

  private findLeaf(): WorkspaceLeaf | null {
    return this.app.workspace.getLeavesOfType(VIEW_TYPE)[0] ?? null;
  }

  private isRelevantFile(file: TAbstractFile): boolean {
    return isPathInSources(
      file.path,
      this.settings.notesFolderPath,
      this.settings.excludedFolderPaths,
    );
  }

  private queueRefresh(): void {
    this.snapshots.invalidate();
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refreshViews();
    }, 150);
  }

  private async refreshViews(): Promise<void> {
    this.snapshots.invalidate();
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof EyeView) await leaf.view.requestRender();
    }
    await this.refreshTreeViews();
  }

  private async refreshTreeViews(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(TREE_VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof TreeView) await leaf.view.requestRender();
    }
  }
}
