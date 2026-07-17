import type {
  Editor,
  MarkdownFileInfo,
  MarkdownView,
  TAbstractFile,
  WorkspaceLeaf,
} from "obsidian";
import { Notice, Plugin, TFile, type TFolder } from "obsidian";
import { completeTaskInFile, shiftTaskDueInFile } from "./actions";
import {
  CREATE_NEW_NOTE_COMMAND,
  MODE_COMMANDS,
  OPEN_COMPLETED_COMMAND,
  STATUS_STEP_COMMANDS,
  UNCHECK_SELECTED_COMMAND,
} from "./commands";
import type { EyeMode } from "./constants";
import {
  fileNotFoundMessage,
  isEyeMode,
  TASKS_PLUGIN_REQUIRED_MESSAGE,
} from "./constants";
import { todayIso } from "./date";
import { canUncheckSelectedTasks, uncheckSelectedTasks } from "./editorUncheck";
import {
  newPersonalTimeOff,
  normalizeAvailabilitySettings,
  normalizeHolidayCache,
  requiredHolidayYears,
  syncNagerCountries,
  syncNagerHolidayYears,
} from "./holidaySync";
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
import type { StatusStepDirection } from "./noteStatus";
import { stepNoteStatus } from "./noteStatus";
import { TasksEyeSettingTab } from "./settings";
import type { TasksApiV1 } from "./tasksApi";
import { getTasksApi } from "./tasksApi";
import type { EyeFile, EyeSettings, RowModel } from "./types";
import type { AvailabilityConfig, PersonalTimeOff } from "./vacation";
import {
  availabilityConfigFromSettings,
  DEFAULT_AVAILABILITY_SETTINGS,
  EMPTY_HOLIDAY_CACHE,
} from "./vacation";
import { EyeView, VIEW_TYPE } from "./view";

function defaultSettings(): EyeSettings {
  return {
    mode: "open",
    contextFilter: "*",
    notesFolderPath: DEFAULT_MANAGED_FOLDER_PATH,
    availability: {
      countryCode: DEFAULT_AVAILABILITY_SETTINGS.countryCode,
      nonWorkingWeekdays: [...DEFAULT_AVAILABILITY_SETTINGS.nonWorkingWeekdays],
      personalTimeOff: [],
    },
    holidayCache: {
      countryCode: EMPTY_HOLIDAY_CACHE.countryCode,
      years: {},
      countries: [],
      countriesFetchedAt: null,
    },
  };
}

function normalizeSettings(value: unknown): EyeSettings {
  const defaults = defaultSettings();
  const saved =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return {
    mode: isEyeMode(saved.mode) ? saved.mode : defaults.mode,
    contextFilter:
      typeof saved.contextFilter === "string" && saved.contextFilter
        ? saved.contextFilter
        : defaults.contextFilter,
    notesFolderPath: normalizeManagedFolderPath(
      typeof saved.notesFolderPath === "string"
        ? saved.notesFolderPath
        : defaults.notesFolderPath,
    ),
    availability: normalizeAvailabilitySettings(saved.availability),
    holidayCache: normalizeHolidayCache(saved.holidayCache),
  };
}

export default class TheEyePlugin extends Plugin {
  settings: EyeSettings = defaultSettings();
  private settingsTab: TasksEyeSettingTab | null = null;
  private holidaySyncChain: Promise<void> = Promise.resolve();
  private holidaySyncCount = 0;
  private holidaySyncError: string | null = null;
  private personalSequence = 0;
  private refreshTimer: number | null = null;

  get holidaySyncing(): boolean {
    return this.holidaySyncCount > 0;
  }

  async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());

    this.registerView(VIEW_TYPE, (leaf) => new EyeView(leaf, this));
    this.settingsTab = new TasksEyeSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);

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
    for (const direction of Object.keys(
      STATUS_STEP_COMMANDS,
    ) as StatusStepDirection[]) {
      const command = STATUS_STEP_COMMANDS[direction];
      this.addCommand({
        id: command.id,
        name: command.name,
        hotkeys: [command.hotkey],
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
    if (!this.tasksApiAvailable()) {
      new Notice(TASKS_PLUGIN_REQUIRED_MESSAGE);
    }
    void this.refreshHolidayCountries();
    void this.refreshHolidayData();
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
    const files = await readEyeFiles(this.app, this.settings.notesFolderPath);
    void this.refreshHolidayData(false, files);
    return files;
  }

  availabilityConfig(): AvailabilityConfig {
    return availabilityConfigFromSettings(
      this.settings.availability,
      this.settings.holidayCache,
    );
  }

  holidaySyncStatus(): string {
    if (this.holidaySyncing) return "Refreshing cached public holidays…";
    if (this.holidaySyncError) {
      return `Last refresh failed: ${this.holidaySyncError}`;
    }
    if (!this.settings.availability.countryCode) {
      return "Choose a country to enable public holidays.";
    }
    const years = Object.keys(this.settings.holidayCache.years).sort();
    return years.length > 0
      ? `Cached years: ${years.join(", ")}. Data refreshes automatically.`
      : "No cached public holidays yet.";
  }

  async refreshHolidayCountries(force = false): Promise<void> {
    await this.enqueueHolidaySync(async () => {
      const result = await syncNagerCountries(this.settings.holidayCache, {
        force,
      });
      if (result.changed) {
        this.settings.holidayCache = {
          ...this.settings.holidayCache,
          countries: result.cache.countries,
          countriesFetchedAt: result.cache.countriesFetchedAt,
        };
        await this.saveData(this.settings);
      }
      this.recordHolidaySyncErrors(result.errors);
    });
  }

  async refreshHolidayData(
    force = false,
    files: readonly EyeFile[] = [],
  ): Promise<void> {
    const countryCode = this.settings.availability.countryCode;
    if (!countryCode) return;
    const years = requiredHolidayYears(files);
    await this.enqueueHolidaySync(async () => {
      if (this.settings.availability.countryCode !== countryCode) return;
      const result = await syncNagerHolidayYears(
        this.settings.holidayCache,
        countryCode,
        years,
        { force },
      );
      if (this.settings.availability.countryCode !== countryCode) return;
      if (result.changed) {
        this.settings.holidayCache = result.cache;
        await this.saveData(this.settings);
        await this.refreshViews();
      }
      this.recordHolidaySyncErrors(result.errors);
    });
  }

  async setHolidayCountry(countryCode: string): Promise<void> {
    const normalized = /^[A-Z]{2}$/.test(countryCode.toUpperCase())
      ? countryCode.toUpperCase()
      : "";
    if (this.settings.availability.countryCode === normalized) return;
    this.settings.availability.countryCode = normalized;
    if (this.settings.holidayCache.countryCode !== normalized) {
      this.settings.holidayCache = {
        ...this.settings.holidayCache,
        countryCode: normalized,
        years: {},
      };
    }
    this.holidaySyncError = null;
    await this.saveData(this.settings);
    await this.refreshViews();
    this.settingsTab?.update();
    if (normalized) await this.refreshHolidayData(true);
  }

  async setNonWorkingWeekday(day: number, enabled: boolean): Promise<void> {
    if (!Number.isInteger(day) || day < 0 || day > 6) return;
    const days = new Set(this.settings.availability.nonWorkingWeekdays);
    if (enabled) days.add(day);
    else days.delete(day);
    this.settings.availability.nonWorkingWeekdays = [...days].sort(
      (a, b) => a - b,
    );
    await this.saveData(this.settings);
    await this.refreshViews();
  }

  async addPersonalTimeOff(): Promise<void> {
    const id = `time-off-${Date.now().toString(36)}-${++this.personalSequence}`;
    this.settings.availability.personalTimeOff = [
      ...this.settings.availability.personalTimeOff,
      newPersonalTimeOff(id),
    ];
    await this.saveData(this.settings);
    await this.refreshViews();
  }

  async updatePersonalTimeOff(
    id: string,
    patch: Partial<Pick<PersonalTimeOff, "from" | "to" | "label">>,
  ): Promise<void> {
    const entry = this.settings.availability.personalTimeOff.find(
      (candidate) => candidate.id === id,
    );
    if (!entry) return;
    Object.assign(entry, patch);
    entry.label = entry.label.trim();
    this.settings.availability.personalTimeOff.sort(
      (a, b) => a.from.localeCompare(b.from) || a.id.localeCompare(b.id),
    );
    await this.saveData(this.settings);
    await this.refreshViews();
  }

  async deletePersonalTimeOff(id: string): Promise<void> {
    const next = this.settings.availability.personalTimeOff.filter(
      (entry) => entry.id !== id,
    );
    if (next.length === this.settings.availability.personalTimeOff.length) {
      return;
    }
    this.settings.availability.personalTimeOff = next;
    await this.saveData(this.settings);
    await this.refreshViews();
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

  private async enqueueHolidaySync(work: () => Promise<void>): Promise<void> {
    this.holidaySyncCount++;
    this.settingsTab?.update();
    const run = this.holidaySyncChain.then(work, work);
    this.holidaySyncChain = run.catch(() => undefined);
    try {
      await run;
    } catch (error) {
      this.holidaySyncError =
        error instanceof Error ? error.message : String(error);
      console.error("Tasks Eye could not refresh public holidays.", error);
    } finally {
      this.holidaySyncCount--;
      this.settingsTab?.update();
    }
  }

  private recordHolidaySyncErrors(errors: readonly string[]): void {
    this.holidaySyncError = errors.length > 0 ? errors.join("; ") : null;
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
