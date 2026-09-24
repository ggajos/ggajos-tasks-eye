import type { ViewStateResult, WorkspaceLeaf } from "obsidian";
import { ItemView, MarkdownRenderer, setIcon } from "obsidian";
import { BoardCollapseState } from "./boardCollapse";
import type { StatusNoteGroup, StatusTaskNode } from "./completedTasks";
import { collectStatusGroups, groupMatchedCount } from "./completedTasks";
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
  getGlobalContext,
  isGlobalContextFilter,
  normalizeContextFilter,
  withVacationContext,
} from "./context";
import { formatHumanDate, nowDate, shiftIsoDate, todayIso } from "./date";
import type TheEyePlugin from "./main";
import type { BoardBucket, BoardDayGroup, RenderItem } from "./model";
import {
  boardItemsForContext,
  buildBoardBuckets,
  buildRowModels,
  selectRowModels,
} from "./model";
import {
  canLowerPriority,
  canRaisePriority,
  NORMAL_PRIORITY,
  priorityRowClasses,
} from "./priority";
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
const ALL_CLEAR_ICON = "ggajos-tasks-eye-circle-check";

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && DATE_RE.test(value);
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
  return `Move due date 1 day ${deltaDays > 0 ? "later" : "earlier"}`;
}

function headingId(prefix: string, key: string): string {
  return `eye-${prefix}-${key.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}`;
}

interface ViewState {
  mode: EyeMode;
  date: string;
  showFuture: boolean;
}

export function emptyMessage(mode: EyeMode): string {
  if (mode === "focus") return "Today is handled.";
  if (mode === "inbox") return "Inbox zero.";
  return `No notes in ${MODE_LABELS[mode]}.`;
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

export class EyeView extends ItemView {
  private plugin: TheEyePlugin;
  private state: ViewState;
  private renderToken = 0;
  private readonly bucketCollapse = new BoardCollapseState();

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
    const globalContext = getGlobalContext(files);
    const contexts = this.contextsForMode(discoverContexts(files));
    const contextFilter = normalizeContextFilter(
      this.plugin.settings.contextFilter,
      contexts,
      globalContext,
    );

    root.replaceChildren();

    if (this.state.mode === "done") {
      this.renderToolbar(root, contexts, contextFilter, globalContext);
      await this.renderCompleted(root, files, contextFilter);
      return;
    }

    if (!this.plugin.tasksApiAvailable()) {
      this.renderToolbar(root, contexts, contextFilter, globalContext);
      root.appendChild(
        element("div", "eye-error", TASKS_PLUGIN_REQUIRED_MESSAGE),
      );
      return;
    }

    const availability = this.plugin.availabilityConfig();
    const models = buildRowModels(files, availability);
    const rows = selectRowModels(models, files, this.state.mode, contextFilter);
    this.renderToolbar(root, contexts, contextFilter, globalContext, {
      focus: selectRowModels(models, files, "focus", contextFilter).length,
      inbox: selectRowModels(models, files, "inbox", contextFilter).length,
    });
    const list = element("div", "eye-list");
    root.appendChild(list);

    if (this.state.mode === "focus") {
      const rendered = await this.renderFocus(
        list,
        rows,
        selectRowModels(models, files, "open", "*"),
        contextFilter,
        availability,
        globalContext,
      );
      if (!rendered) {
        list.appendChild(this.renderEmptyState());
      }
      return;
    }

    const vacationSourceRows =
      this.state.mode === "open"
        ? selectRowModels(models, files, this.state.mode, "*")
        : rows;
    const rendered = await this.renderBoard(
      list,
      rows,
      vacationSourceRows,
      contextFilter,
      availability,
      globalContext,
    );
    if (!rendered) {
      list.appendChild(this.renderEmptyState());
    }
  }

  private renderEmptyState(): HTMLElement {
    if (this.state.mode !== "focus" && this.state.mode !== "inbox") {
      return element("div", "eye-empty", emptyMessage(this.state.mode));
    }

    const state = element("div", "eye-empty eye-all-clear");
    const icon = element("span", "eye-all-clear-icon");
    icon.setAttribute("aria-hidden", "true");
    setIcon(icon, ALL_CLEAR_ICON);
    const iconSvg = icon.querySelector<SVGElement>("svg");
    iconSvg?.setAttribute("viewBox", "0 0 24 24");
    iconSvg?.style.setProperty("height", "64px", "important");
    iconSvg?.style.setProperty("width", "64px", "important");
    state.append(
      icon,
      element("div", "eye-all-clear-message", emptyMessage(this.state.mode)),
    );
    return state;
  }

  private contextsForMode(contexts: string[]): string[] {
    return this.state.mode === "focus" || this.state.mode === "open"
      ? withVacationContext(contexts)
      : contexts;
  }

  private renderToolbar(
    root: HTMLElement,
    contexts: string[],
    activeContextFilter?: string,
    globalContext = "*",
    counts?: Partial<Record<"focus" | "inbox", number>>,
  ): void {
    const activeFilter =
      activeContextFilter ??
      normalizeContextFilter(
        this.plugin.settings.contextFilter,
        contexts,
        globalContext,
      );
    const toolbar = element("div", "eye-toolbar");
    const nav = element("div", "eye-mode-nav");

    for (const mode of MODES) {
      const count =
        mode === "focus" || mode === "inbox" ? counts?.[mode] : undefined;
      const countLabel =
        count === undefined || count === 0
          ? ""
          : ` (${count} ${count === 1 ? "item" : "items"})`;
      const btn = button(
        `eye-mode-button${mode === this.state.mode ? " is-active" : ""}`,
        `Show ${MODE_LABELS[mode]}${countLabel}`,
        () => void this.plugin.openEye(mode),
        MODE_LABELS[mode],
      );
      if (count !== undefined && count > 0) {
        const badge = element("span", "eye-mode-count", String(count));
        badge.setAttribute("aria-hidden", "true");
        btn.appendChild(badge);
      }
      nav.appendChild(btn);
    }

    toolbar.appendChild(nav);
    if (this.state.mode === "done") {
      toolbar.appendChild(this.renderDateNav());
      toolbar.appendChild(this.renderShowFutureToggle());
    }
    toolbar.appendChild(element("div", "eye-toolbar-spacer"));

    toolbar.appendChild(
      contextFilterControl(
        contexts,
        activeFilter,
        (context) => {
          void this.plugin
            .setContextFilter(context)
            .then(() => this.requestRender());
        },
        globalContext,
      ),
    );

    root.appendChild(toolbar);
  }

  private renderShowFutureToggle(): HTMLElement {
    const active = this.state.showFuture;
    const btn = button(
      `eye-mode-button${active ? " is-active" : ""}`,
      "Show unfinished tasks with a due date",
      () => void this.setShowFuture(!active),
      "Unfinished",
    );
    btn.setAttribute("aria-pressed", `${active}`);
    return btn;
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
    const grouped = collectStatusGroups(
      files,
      this.state.date,
      this.state.showFuture,
    );
    const contexts = Object.keys(grouped)
      .filter(
        (context) =>
          isGlobalContextFilter(contextFilter, files) ||
          context === contextFilter,
      )
      .sort();

    const list = element("div", "eye-list eye-completed-list");
    root.appendChild(list);

    if (contexts.length === 0) {
      list.appendChild(
        element(
          "div",
          "eye-empty",
          `No completed tasks for ${formatHumanDate(this.state.date)}.`,
        ),
      );
      return;
    }

    for (const context of contexts) {
      const groups = [...(grouped[context] ?? [])].sort((a, b) =>
        a.fileName.localeCompare(b.fileName),
      );
      const header = element("div", "eye-bucket-header eye-completed-header");
      header.appendChild(
        element("span", "eye-bucket-count", `${groupMatchedCount(groups)}`),
      );
      const label = element("h2", "eye-bucket-label", context);
      label.id = completedContextId(context);
      header.appendChild(label);
      list.appendChild(header);

      for (const group of groups) await this.renderStatusNote(list, group);
    }
  }

  private async renderStatusNote(
    list: HTMLElement,
    group: StatusNoteGroup,
  ): Promise<void> {
    const row = element("div", "eye-completed-file");
    const header = element("div", "eye-completed-file-header");
    header.appendChild(
      this.renderCompletedNoteLink(group.fileName, group.filePath),
    );
    header.appendChild(
      element("span", "eye-day-count", `${group.matchedCount}`),
    );
    row.appendChild(header);

    const taskList = element("div", "eye-completed-tasks");
    for (const node of group.nodes) {
      await this.renderStatusNode(taskList, node, group.filePath);
    }
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

  private async renderStatusNode(
    list: HTMLElement,
    node: StatusTaskNode,
    filePath: string,
  ): Promise<void> {
    const modifier = node.matched
      ? node.future
        ? " eye-status-future"
        : ""
      : " eye-status-context";
    const row = element("div", `eye-completed-task${modifier}`);

    const icon = element("span", "eye-completed-check");
    if (node.completed) setIcon(icon, "check");
    else if (node.future) setIcon(icon, "clock");
    row.appendChild(icon);

    const body = element("div", "eye-completed-task-text");
    await MarkdownRenderer.render(this.app, node.text, body, filePath, this);
    unwrapSingleParagraph(body);
    row.appendChild(body);

    list.appendChild(row);

    if (node.children.length > 0) {
      const children = element("div", "eye-completed-children");
      for (const child of node.children) {
        await this.renderStatusNode(children, child, filePath);
      }
      list.appendChild(children);
    }
  }

  private async renderBoard(
    list: HTMLElement,
    rows: RowModel[],
    vacationSourceRows: RowModel[],
    contextFilter: string,
    availability: AvailabilityConfig,
    globalContext: string,
  ): Promise<boolean> {
    list.classList.add("eye-tree");

    const items =
      this.state.mode === "open"
        ? boardItemsForContext(
            rows,
            vacationSourceRows,
            contextFilter,
            availability,
            globalContext,
          )
        : rows.map((model): RenderItem => ({ kind: "task", model }));
    const buckets = buildBoardBuckets(items, nowDate());

    for (const bucket of buckets) await this.renderBucket(list, bucket);
    return buckets.length > 0;
  }

  private async renderFocus(
    list: HTMLElement,
    rows: RowModel[],
    vacationSourceRows: RowModel[],
    contextFilter: string,
    availability: AvailabilityConfig,
    globalContext: string,
  ): Promise<boolean> {
    list.classList.add("eye-focus-list");
    const items = boardItemsForContext(
      rows,
      vacationSourceRows,
      contextFilter,
      availability,
      globalContext,
    );
    const focusItems = buildBoardBuckets(items, nowDate())
      .filter((bucket) => bucket.key === "overdue" || bucket.key === "today")
      .flatMap((bucket) => bucket.days)
      .flatMap((day) => day.items);

    for (const item of focusItems) await this.renderItem(list, item);
    return focusItems.length > 0;
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
        await this.renderItem(children, item);
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
      bucket.key === "thisWeek" ||
      bucket.key === "nextWeek" ||
      bucket.key === "thisMonth" ||
      bucket.key === "nextMonth" ||
      bucket.key === "future"
    ) {
      return true;
    }
    if (bucket.days.length > 1) return true;
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

  private async renderItem(list: HTMLElement, item: RenderItem): Promise<void> {
    if (item.kind === "task") {
      await this.renderRow(list, item.model);
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

  private applyPriority(row: HTMLElement, model: RowModel): void {
    const priority = model.earliestTask?.priority ?? NORMAL_PRIORITY;
    row.dataset.eyePriority = String(priority);
    const classes = priorityRowClasses(priority);
    if (classes.length > 0) row.classList.add(...classes);
  }

  private async renderRow(list: HTMLElement, model: RowModel): Promise<void> {
    const row = element("div", "eye-row eye-task-row");
    this.applyPriority(row, model);
    const noteLine = element("div", "eye-note-line");
    const actionCell = element("div", "eye-action-cell");
    const action = element("div", "eye-task-title");
    await this.renderActionMarkdown(action, model);

    actionCell.appendChild(action);
    if (model.errors.length > 0) actionCell.appendChild(attentionPill());
    noteLine.appendChild(this.renderNoteLink(model));
    noteLine.appendChild(this.renderContextBadge(model));

    const actionLine = element("div", "eye-action-line");
    actionLine.appendChild(element("span", "eye-row-separator", "→"));
    actionLine.appendChild(actionCell);

    const errors =
      model.errors.length > 0 ? element("div", "eye-errors") : null;
    if (errors) {
      for (const violation of model.errors) {
        const error = element("div", undefined, violation.message);
        error.dataset.eyeViolation = violation.code;
        errors.appendChild(error);
      }
    }

    row.appendChild(noteLine);
    row.appendChild(actionLine);
    if (errors) row.appendChild(errors);
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
      for (const delta of [-1, 1]) {
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

    const raise = button(
      "eye-shift-button",
      "Raise task priority",
      () => void this.plugin.setTaskPriority(model, "raise"),
      "↑",
    );
    raise.disabled = !canRaisePriority(task.priority);
    actions.appendChild(raise);

    const lower = button(
      "eye-shift-button",
      "Lower task priority",
      () => void this.plugin.setTaskPriority(model, "lower"),
      "↓",
    );
    lower.disabled = !canLowerPriority(task.priority);
    actions.appendChild(lower);

    return actions;
  }
}
