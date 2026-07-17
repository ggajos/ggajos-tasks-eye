import type { ViewStateResult, WorkspaceLeaf } from "obsidian";
import { ItemView, MarkdownRenderer, setIcon } from "obsidian";
import { BoardCollapseState } from "./boardCollapse";
import type { CompletedTask } from "./completedTasks";
import { collectCompletedTasks, groupCompletedTasks } from "./completedTasks";
import type { EyeMode } from "./constants";
import {
  BOARD_RENDER_FAILED_MESSAGE,
  isEyeMode,
  MODE_LABELS,
  MODES,
  TASKS_PLUGIN_REQUIRED_MESSAGE,
} from "./constants";
import {
  discoverContexts,
  normalizeContextFilter,
  withVacationContext,
} from "./context";
import {
  formatHumanDate,
  formatYmd,
  nowDate,
  nowTs,
  shiftIsoDate,
  todayIso,
} from "./date";
import type TheEyePlugin from "./main";
import type { BoardBucket, BoardDayGroup, RenderItem } from "./model";
import {
  boardItemsForContext,
  buildBoardBuckets,
  rowStateClasses,
  selectRows,
} from "./model";
import type { EyeFile, RowModel } from "./types";
import {
  button,
  contextFilterControl,
  element,
  unwrapSingleParagraph,
} from "./ui";
import type { AvailabilityConfig, VacationMarker } from "./vacation";

export const VIEW_TYPE = "ggajos-tasks-eye-view";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && DATE_RE.test(value);
}

function fileTaskCount(files: Record<string, CompletedTask[]>): number {
  return Object.values(files).reduce((sum, tasks) => sum + tasks.length, 0);
}

function completedContextId(context: string): string {
  return `eye-completed-${context
    .replace(/[^a-z0-9_-]+/gi, "-")
    .toLowerCase()}`;
}

function pill(text: string): HTMLElement {
  return element("span", "eye-pill", text);
}

function attentionPill(): HTMLElement {
  const marker = pill("!");
  marker.title = "Needs attention";
  marker.setAttribute("aria-label", "Needs attention");
  return marker;
}

function dueShiftLabel(deltaDays: number): string {
  const interval = Math.abs(deltaDays) === 7 ? "1 week" : "1 day";
  return `Move due date ${interval} ${deltaDays > 0 ? "later" : "earlier"}`;
}

function headingId(prefix: string, key: string): string {
  return `eye-${prefix}-${key.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}`;
}

function isBoardMode(mode: EyeMode): boolean {
  return mode === "open" || mode === "hold";
}

function appendMeta(
  meta: HTMLElement,
  model: RowModel,
  includeDate: boolean,
): void {
  if (includeDate) {
    meta.appendChild(pill(model.dateLabel));
    if (model.yearLabel) meta.appendChild(pill(model.yearLabel));
    if (model.dayLabel) meta.appendChild(pill(model.dayLabel));
  }
}

interface ViewState {
  mode: EyeMode;
  date: string;
}

function readViewState(state: unknown, current: ViewState): ViewState {
  if (typeof state !== "object" || state === null) return current;
  const record = state as Record<string, unknown>;
  return {
    mode: isEyeMode(record.mode) ? record.mode : current.mode,
    date: isIsoDate(record.date) ? record.date : current.date,
  };
}

export class EyeView extends ItemView {
  private plugin: TheEyePlugin;
  private state: ViewState;
  private renderToken = 0;
  private readonly bucketCollapse = new BoardCollapseState();

  constructor(leaf: WorkspaceLeaf, plugin: TheEyePlugin) {
    super(leaf);
    this.plugin = plugin;
    this.state = { mode: plugin.settings.mode, date: todayIso() };
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
    };
    await this.requestRender();
  }

  async setDate(date: string): Promise<void> {
    if (!isIsoDate(date) || date === this.state.date) return;
    this.state = { ...this.state, date };
    if (this.state.mode === "done") await this.requestRender();
  }

  async shiftDate(deltaDays: number): Promise<void> {
    await this.setDate(shiftIsoDate(this.state.date, deltaDays));
  }

  async requestRender(): Promise<void> {
    const token = ++this.renderToken;
    const root = element(
      "div",
      `eye-plugin${this.state.mode === "done" ? " eye-completed-view" : ""}`,
    );
    this.contentEl.replaceChildren(root);
    this.renderToolbar(root, []);
    root.appendChild(element("div", "eye-empty", "Loading…"));

    const folderError = this.plugin.managedFolderError();
    if (folderError) {
      root.replaceChildren();
      this.renderToolbar(root, []);
      root.appendChild(element("div", "eye-error", folderError));
      return;
    }

    try {
      const files = await this.plugin.readFiles();
      if (token !== this.renderToken) return;
      await this.renderLoadedContent(root, files);
    } catch (error) {
      if (token !== this.renderToken) return;
      console.error("Tasks Eye failed to render the board.", error);
      root.replaceChildren();
      this.renderToolbar(root, []);
      root.appendChild(
        element("div", "eye-error", BOARD_RENDER_FAILED_MESSAGE),
      );
    }
  }

  private async renderLoadedContent(
    root: HTMLElement,
    files: EyeFile[],
  ): Promise<void> {
    const contexts = this.contextsForMode(discoverContexts(files));
    const contextFilter = normalizeContextFilter(
      this.plugin.settings.contextFilter,
      contexts,
    );

    root.replaceChildren();
    this.renderToolbar(root, contexts, contextFilter);

    if (this.state.mode === "done") {
      await this.renderCompleted(root, files, contextFilter);
      return;
    }

    if (!this.plugin.tasksApiAvailable()) {
      root.appendChild(
        element("div", "eye-error", TASKS_PLUGIN_REQUIRED_MESSAGE),
      );
      return;
    }

    const availability = this.plugin.availabilityConfig();
    const rows = selectRows(
      files,
      this.state.mode,
      contextFilter,
      availability,
    );
    const list = element("div", "eye-list");
    root.appendChild(list);

    if (isBoardMode(this.state.mode)) {
      const vacationSourceRows =
        this.state.mode === "open"
          ? selectRows(files, this.state.mode, "*", availability)
          : rows;
      const rendered = await this.renderBoard(
        list,
        rows,
        vacationSourceRows,
        contextFilter,
        availability,
      );
      if (!rendered) {
        list.appendChild(element("div", "eye-empty", this.emptyMessage()));
      }
      return;
    }

    if (rows.length === 0) {
      list.appendChild(element("div", "eye-empty", this.emptyMessage()));
      return;
    }

    list.classList.add("eye-flat-list");
    for (const row of rows) await this.renderRow(list, row, false);
  }

  private emptyMessage(): string {
    if (this.state.mode === "inbox") return "No notes need attention.";
    return `No notes in ${MODE_LABELS[this.state.mode]}.`;
  }

  private contextsForMode(contexts: string[]): string[] {
    return this.state.mode === "open"
      ? withVacationContext(contexts)
      : contexts;
  }

  private renderToolbar(
    root: HTMLElement,
    contexts: string[],
    activeContextFilter = normalizeContextFilter(
      this.plugin.settings.contextFilter,
      contexts,
    ),
  ): void {
    const toolbar = element("div", "eye-toolbar");
    const nav = element("div", "eye-mode-nav");

    for (const mode of MODES) {
      const btn = button(
        `eye-mode-button${mode === this.state.mode ? " is-active" : ""}`,
        `Show ${MODE_LABELS[mode]}`,
        () => void this.plugin.openEye(mode),
        MODE_LABELS[mode],
      );
      nav.appendChild(btn);
    }

    toolbar.appendChild(nav);
    if (this.state.mode === "done") toolbar.appendChild(this.renderDateNav());
    toolbar.appendChild(element("div", "eye-toolbar-spacer"));

    toolbar.appendChild(
      contextFilterControl(contexts, activeContextFilter, (context) => {
        void this.plugin
          .setContextFilter(context)
          .then(() => this.requestRender());
      }),
    );

    root.appendChild(toolbar);
  }

  private renderDateNav(): HTMLElement {
    const nav = element("div", "eye-date-nav");

    const prev = button(
      "eye-icon-button",
      "Previous day",
      () => void this.shiftDate(-1),
    );
    setIcon(prev, "chevron-left");
    nav.appendChild(prev);

    const input = element("input", "eye-date-input");
    input.type = "date";
    input.value = this.state.date;
    input.setAttribute("aria-label", "Completion date");
    input.addEventListener("change", () => {
      void this.setDate(input.value);
    });
    nav.appendChild(input);

    nav.appendChild(
      button(
        "eye-mode-button",
        "Show today",
        () => void this.setDate(todayIso()),
        "Today",
      ),
    );

    const next = button(
      "eye-icon-button",
      "Next day",
      () => void this.shiftDate(1),
    );
    setIcon(next, "chevron-right");
    nav.appendChild(next);

    return nav;
  }

  private async renderCompleted(
    root: HTMLElement,
    files: EyeFile[],
    contextFilter: string,
  ): Promise<void> {
    const tasks = collectCompletedTasks(files, this.state.date).filter(
      (task) =>
        !contextFilter ||
        contextFilter === "*" ||
        task.context === contextFilter,
    );
    const list = element("div", "eye-list eye-completed-list");
    root.appendChild(list);

    if (tasks.length === 0) {
      list.appendChild(
        element(
          "div",
          "eye-empty",
          `No completed tasks for ${formatHumanDate(this.state.date)}.`,
        ),
      );
      return;
    }

    await this.renderCompletedGroups(list, tasks);
  }

  private async renderCompletedGroups(
    list: HTMLElement,
    tasks: CompletedTask[],
  ): Promise<void> {
    const grouped = groupCompletedTasks(tasks);

    for (const context of Object.keys(grouped).sort()) {
      const files = grouped[context] ?? {};
      const header = element("div", "eye-bucket-header eye-completed-header");
      header.appendChild(
        element("span", "eye-bucket-count", `${fileTaskCount(files)}`),
      );
      const label = element("h2", "eye-bucket-label", context);
      label.id = completedContextId(context);
      header.appendChild(label);
      list.appendChild(header);

      for (const [fileName, fileTasks] of Object.entries(files).sort()) {
        await this.renderCompletedFileGroup(list, fileName, fileTasks);
      }
    }
  }

  private async renderCompletedFileGroup(
    list: HTMLElement,
    fileName: string,
    tasks: CompletedTask[],
  ): Promise<void> {
    const row = element("div", "eye-completed-file");
    const header = element("div", "eye-completed-file-header");
    header.appendChild(
      this.renderCompletedNoteLink(fileName, tasks[0]?.filePath ?? ""),
    );
    header.appendChild(element("span", "eye-day-count", `${tasks.length}`));
    row.appendChild(header);

    const taskList = element("div", "eye-completed-tasks");
    for (const task of tasks) await this.renderCompletedTask(taskList, task);
    row.appendChild(taskList);

    list.appendChild(row);
  }

  private renderCompletedNoteLink(
    fileName: string,
    filePath: string,
  ): HTMLAnchorElement {
    const link = element("a", "eye-note-link", fileName);
    link.href = "#";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (filePath) void this.plugin.openFile(filePath);
    });
    return link;
  }

  private async renderCompletedTask(
    list: HTMLElement,
    task: CompletedTask,
  ): Promise<void> {
    const row = element("div", "eye-completed-task");
    const icon = element("span", "eye-completed-check");
    setIcon(icon, "check");
    row.appendChild(icon);

    const body = element("div", "eye-completed-task-text");
    await MarkdownRenderer.render(
      this.app,
      task.text,
      body,
      task.filePath,
      this,
    );
    unwrapSingleParagraph(body);
    row.appendChild(body);

    list.appendChild(row);
  }

  private async renderBoard(
    list: HTMLElement,
    rows: RowModel[],
    vacationSourceRows: RowModel[],
    contextFilter: string,
    availability: AvailabilityConfig,
  ): Promise<boolean> {
    list.classList.add("eye-tree");

    const items =
      this.state.mode === "open"
        ? boardItemsForContext(
            rows,
            vacationSourceRows,
            contextFilter,
            availability,
          )
        : rows.map((model): RenderItem => ({ kind: "task", model }));
    const buckets = buildBoardBuckets(items, nowDate());

    for (const bucket of buckets) await this.renderBucket(list, bucket);
    return buckets.length > 0;
  }

  private async renderBucket(
    list: HTMLElement,
    bucket: BoardBucket,
  ): Promise<void> {
    const collapsed = this.bucketCollapse.isCollapsed(
      this.state.mode,
      bucket.key,
    );
    const group = element("section", "eye-bucket tree-item");
    group.dataset.eyeBucket = bucket.key;
    if (collapsed) group.classList.add("is-collapsed");

    const header = element("div", "eye-bucket-header tree-item-self");
    header.tabIndex = 0;
    header.setAttribute("role", "treeitem");
    header.setAttribute("aria-expanded", `${!collapsed}`);

    const label = element(
      "span",
      "eye-bucket-label tree-item-inner",
      bucket.label,
    );
    label.id = headingId("bucket", `${this.state.mode}-${bucket.key}`);

    const children = element("div", "eye-bucket-children tree-item-children");
    children.id = `${label.id}-children`;
    children.hidden = collapsed;
    header.setAttribute("aria-controls", children.id);

    const collapseIcon = element("span", "eye-collapse-icon");
    this.setBucketCollapseIcon(collapseIcon, collapsed);
    header.appendChild(collapseIcon);
    header.appendChild(label);
    header.appendChild(
      element("span", "eye-bucket-count", `${bucket.taskCount}`),
    );

    const toggleBucket = () => {
      const nextCollapsed = this.bucketCollapse.toggle(
        this.state.mode,
        bucket.key,
      );
      group.classList.toggle("is-collapsed", nextCollapsed);
      children.hidden = nextCollapsed;
      header.setAttribute("aria-expanded", `${!nextCollapsed}`);
      this.setBucketCollapseIcon(collapseIcon, nextCollapsed);
    };

    header.addEventListener("click", toggleBucket);
    header.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleBucket();
    });

    group.appendChild(header);

    const showDays = this.shouldShowDayDividers(bucket);
    for (const day of bucket.days) {
      if (showDays) this.renderDayDivider(children, day);
      for (const item of day.items) {
        await this.renderItem(children, item, true);
      }
    }

    group.appendChild(children);
    list.appendChild(group);
  }

  private setBucketCollapseIcon(icon: HTMLElement, collapsed: boolean): void {
    icon.replaceChildren();
    setIcon(icon, collapsed ? "chevron-right" : "chevron-down");
  }

  private shouldShowDayDividers(bucket: BoardBucket): boolean {
    if (bucket.key === "noDue") return false;
    if (
      bucket.key === "thisMonth" ||
      bucket.key === "nextMonth" ||
      bucket.key === "future"
    ) {
      return true;
    }
    if (bucket.days.length > 1) return true;
    if (bucket.key === "today") {
      return bucket.days.some((day) => day.key !== formatYmd(nowTs()));
    }
    return false;
  }

  private renderDayDivider(list: HTMLElement, day: BoardDayGroup): void {
    const divider = element("div", "eye-day-divider");
    const label = element("h3", "eye-day-label", day.label);
    label.id = headingId("day", day.key);
    divider.appendChild(label);
    divider.appendChild(element("span", "eye-day-count", `${day.taskCount}`));
    list.appendChild(divider);
  }

  private async renderItem(
    list: HTMLElement,
    item: RenderItem,
    taskFirst: boolean,
  ): Promise<void> {
    if (item.kind === "task") {
      await this.renderRow(list, item.model, taskFirst);
    } else {
      this.renderMarker(list, item.marker);
    }
  }

  private renderMarker(list: HTMLElement, marker: VacationMarker): void {
    const row = element("div", "eye-row eye-marker");
    const main = element("div", "eye-row-main");
    const title = element("div", "eye-row-title", marker.label);
    main.appendChild(title);
    row.appendChild(main);
    row.appendChild(this.renderMarkerBadge(marker));
    list.appendChild(row);
  }

  private renderMarkerBadge(marker: VacationMarker): HTMLElement {
    const badge = element("div", "eye-context-badge eye-marker-badge", "OOO");
    badge.title = marker.label;
    badge.setAttribute("aria-label", `OOO marker: ${marker.label}`);
    return badge;
  }

  private renderContextBadge(model: RowModel): HTMLElement {
    const rail = element("div", "eye-context-badge", model.contextLabel);
    rail.dataset.eyeContext = model.contextKey;
    rail.title = model.contextLabel;
    rail.setAttribute("aria-label", `Context: ${model.contextLabel}`);
    return rail;
  }

  private renderNoteLink(model: RowModel): HTMLAnchorElement {
    const link = element("a", "eye-note-link", model.file.basename);
    link.href = "#";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      void this.plugin.openFile(model.file.path);
    });
    return link;
  }

  private async renderRow(
    list: HTMLElement,
    model: RowModel,
    taskFirst: boolean,
  ): Promise<void> {
    const row = element(
      "div",
      ["eye-row", ...rowStateClasses(model)].join(" "),
    );
    const main = element("div", "eye-row-main");
    const meta = element("div", "eye-meta");

    if (taskFirst) {
      const action = element("div", "eye-task-title");
      const note = element("div", "eye-note-line");
      note.appendChild(this.renderNoteLink(model));
      if (model.errors.length > 0) note.appendChild(attentionPill());
      appendMeta(meta, model, false);
      await this.renderActionMarkdown(action, model);

      main.appendChild(action);
      main.appendChild(note);
    } else {
      const title = element("div", "eye-row-title");
      title.appendChild(this.renderNoteLink(model));
      if (model.errors.length > 0) title.appendChild(attentionPill());

      main.appendChild(title);

      if (model.earliestTask) {
        const action = element("div", "eye-action");
        appendMeta(meta, model, true);
        await this.renderActionMarkdown(action, model);
        main.appendChild(action);
      }
    }

    if (meta.childNodes.length > 0) main.appendChild(meta);

    if (model.errors.length > 0) {
      const errors = element("div", "eye-errors");
      for (const violation of model.errors) {
        const error = element("div", undefined, violation.message);
        error.dataset.eyeViolation = violation.code;
        errors.appendChild(error);
      }
      main.appendChild(errors);
    }

    row.appendChild(main);
    row.appendChild(this.renderContextBadge(model));
    row.appendChild(this.renderActions(model));
    list.appendChild(row);
  }

  private async renderActionMarkdown(
    action: HTMLElement,
    model: RowModel,
  ): Promise<void> {
    await MarkdownRenderer.render(
      this.app,
      model.actionLabel,
      action,
      model.file.path,
      this,
    );
    unwrapSingleParagraph(action);
  }

  private renderActions(model: RowModel): HTMLElement {
    const actions = element("div", "eye-actions");
    const task = model.earliestTask;
    if (!task) return actions;

    const done = button(
      "eye-icon-button",
      "Mark task done",
      () => void this.plugin.completeTask(model),
    );
    setIcon(done, "check");
    actions.appendChild(done);

    if (model.earliestDue !== null) {
      for (const delta of [1, -1, 7, -7]) {
        actions.appendChild(
          button(
            "eye-shift-button",
            dueShiftLabel(delta),
            () => void this.plugin.shiftTaskDue(model, delta),
            delta > 0 ? `+${delta}` : `${delta}`,
          ),
        );
      }
    }

    return actions;
  }
}
