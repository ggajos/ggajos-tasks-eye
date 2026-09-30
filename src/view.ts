import type { ViewStateResult, WorkspaceLeaf } from "obsidian";
import { ItemView, MarkdownRenderer } from "obsidian";
import type { TaskEdit } from "./actions";
import { boardContexts, buildBoard } from "./board";
import { BoardCollapseState } from "./boardCollapse";
import type { EyeMode } from "./constants";
import {
  BOARD_RENDER_FAILED_MESSAGE,
  isEyeMode,
  MODE_LABELS,
  TASKS_PLUGIN_REQUIRED_MESSAGE,
} from "./constants";
import { nowDate, shiftIsoDate, todayIso } from "./date";
import type TheEyePlugin from "./main";
import type { ScreenHost, ScreenUiState } from "./renderer";
import { renderScreen, renderToolbar } from "./renderer";
import type { VaultSnapshot } from "./snapshot";
import type { RowModel } from "./types";
import { element } from "./ui";

export const VIEW_TYPE = "ggajos-tasks-eye-view";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && DATE_RE.test(value);
}

interface ViewState {
  mode: EyeMode;
  date: string;
  showFuture: boolean;
}

function readViewState(state: unknown, current: ViewState): ViewState {
  if (typeof state !== "object" || state === null) return current;
  const record = state as Record<string, unknown>;
  return {
    mode: isEyeMode(record.mode) ? record.mode : current.mode,
    date: isIsoDate(record.date) ? record.date : current.date,
    showFuture:
      typeof record.showFuture === "boolean"
        ? record.showFuture
        : current.showFuture,
  };
}

/**
 * Obsidian adapter over the screen renderer: lifecycle, render tokens and
 * snapshot loading live here; every DOM decision lives in renderer.ts.
 */
export class EyeView extends ItemView {
  private plugin: TheEyePlugin;
  private state: ViewState;
  private renderToken = 0;
  private readonly bucketCollapse = new BoardCollapseState();

  private readonly host: ScreenHost = {
    renderMarkdown: (target, markdown, sourcePath) =>
      MarkdownRenderer.render(this.app, markdown, target, sourcePath, this),
    openFile: (path) => void this.plugin.openFile(path),
    editTask: (model: RowModel, edit: TaskEdit) =>
      void this.plugin.editTask(model, edit),
    openMode: (mode) => void this.plugin.openEye(mode),
    changeContextFilter: (filter) =>
      void this.plugin.preferences
        .setContextFilter(filter)
        .then(() => this.requestRender()),
    changeDate: (date) => void this.setDate(date),
    shiftDate: (deltaDays) => void this.shiftDate(deltaDays),
    toggleShowFuture: () => void this.setShowFuture(!this.state.showFuture),
  };

  constructor(leaf: WorkspaceLeaf, plugin: TheEyePlugin) {
    super(leaf);
    this.plugin = plugin;
    this.state = {
      mode: plugin.settings.mode,
      date: todayIso(),
      showFuture: true,
    };
    this.navigation = true;
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    if (this.state.mode === "done")
      return `Tasks Eye: Done — ${this.state.date}`;
    return `Tasks Eye: ${MODE_LABELS[this.state.mode]}`;
  }

  getIcon(): string {
    return "eye";
  }

  getState(): Record<string, unknown> {
    return {
      ...super.getState(),
      mode: this.state.mode,
      date: this.state.date,
      showFuture: this.state.showFuture,
    };
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    await super.setState(state, result);
    this.state = readViewState(state, this.state);
  }

  protected async onOpen(): Promise<void> {
    await this.requestRender();
  }

  protected async onClose(): Promise<void> {
    this.contentEl.replaceChildren();
  }

  async setMode(mode: EyeMode, date?: string): Promise<void> {
    this.state = {
      mode,
      date: date !== undefined && isIsoDate(date) ? date : this.state.date,
      showFuture: this.state.showFuture,
    };
    await this.requestRender();
  }

  async setShowFuture(value: boolean): Promise<void> {
    if (value === this.state.showFuture) return;
    this.state = { ...this.state, showFuture: value };
    if (this.state.mode === "done") await this.requestRender();
  }

  async setDate(date: string): Promise<void> {
    if (!isIsoDate(date) || date === this.state.date) return;
    this.state = { ...this.state, date };
    if (this.state.mode === "done") await this.requestRender();
  }

  async shiftDate(deltaDays: number): Promise<void> {
    await this.setDate(shiftIsoDate(this.state.date, deltaDays));
  }

  private uiState(): ScreenUiState {
    return {
      mode: this.state.mode,
      date: this.state.date,
      showFuture: this.state.showFuture,
      collapse: this.bucketCollapse,
    };
  }

  async requestRender(): Promise<void> {
    const token = ++this.renderToken;
    const root = element(
      "div",
      `eye-plugin${this.state.mode === "done" ? " eye-completed-view" : ""}`,
    );
    this.contentEl.replaceChildren(root);
    renderToolbar(root, this.uiState(), this.host);
    root.appendChild(element("div", "eye-empty", "Loading…"));

    const folderError = this.plugin.preferences.managedFolderError();
    if (folderError) {
      root.replaceChildren();
      renderToolbar(root, this.uiState(), this.host);
      root.appendChild(element("div", "eye-error", folderError));
      return;
    }

    try {
      const snapshot = await this.plugin.snapshot();
      if (token !== this.renderToken) return;
      await this.renderLoadedContent(root, snapshot);
    } catch (error) {
      if (token !== this.renderToken) return;
      console.error("Tasks Eye failed to render the board.", error);
      root.replaceChildren();
      renderToolbar(root, this.uiState(), this.host);
      root.appendChild(
        element("div", "eye-error", BOARD_RENDER_FAILED_MESSAGE),
      );
    }
  }

  private async renderLoadedContent(
    root: HTMLElement,
    snapshot: VaultSnapshot,
  ): Promise<void> {
    root.replaceChildren();
    const mode = this.state.mode;

    if (mode !== "done" && !this.plugin.tasksApiAvailable()) {
      const { contexts, contextFilter, globalContext } = boardContexts(
        snapshot.files,
        mode,
        this.plugin.settings.contextFilter,
      );
      renderToolbar(
        root,
        this.uiState(),
        this.host,
        contexts,
        contextFilter,
        globalContext,
      );
      root.appendChild(
        element("div", "eye-error", TASKS_PLUGIN_REQUIRED_MESSAGE),
      );
      return;
    }

    const screen = buildBoard(snapshot, {
      mode,
      contextFilter: this.plugin.settings.contextFilter,
      now: nowDate(),
      date: this.state.date,
      showFuture: this.state.showFuture,
    });
    renderToolbar(
      root,
      this.uiState(),
      this.host,
      screen.contexts,
      screen.contextFilter,
      screen.globalContext,
      mode === "done" ? undefined : screen.counts,
    );
    await renderScreen(root, screen, this.uiState(), this.host);
  }
}
