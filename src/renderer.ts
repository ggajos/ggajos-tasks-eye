import { setIcon } from "obsidian";
import type { TaskEdit } from "./actions";
import type { VacationMarker } from "./availability";
import type {
  BoardBucket,
  BoardCounts,
  BoardDayGroup,
  BoardScreen,
  RenderItem,
} from "./board";
import type { BoardCollapseState } from "./boardCollapse";
import type {
  DoneContextGroup,
  StatusNoteGroup,
  StatusTaskNode,
} from "./completedTasks";
import type { EyeMode } from "./constants";
import { MODE_LABELS, MODES } from "./constants";
import {
  canLowerPriority,
  canRaisePriority,
  NORMAL_PRIORITY,
  priorityRowClasses,
} from "./priority";
import type { RowModel } from "./types";
import {
  button,
  contextFilterControl,
  element,
  unwrapSingleParagraph,
} from "./ui";
import type { ViolationCode } from "./validation";
import { violationDocsUrl } from "./violationDocs";

const ALL_CLEAR_ICON = "ggajos-tasks-eye-circle-check";

/** What the renderer needs from its environment; no Obsidian types. */
export interface ScreenHost {
  renderMarkdown(
    target: HTMLElement,
    markdown: string,
    sourcePath: string,
  ): Promise<void>;
  openFile(path: string): void;
  editTask(model: RowModel, edit: TaskEdit): void;
  openMode(mode: EyeMode): void;
  changeContextFilter(filter: string): void;
  changeDate(date: string): void;
  shiftDate(deltaDays: number): void;
  toggleShowFuture(): void;
}

export interface ScreenUiState {
  mode: EyeMode;
  date: string;
  showFuture: boolean;
  collapse: BoardCollapseState;
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

function renderViolationLink(
  code: ViolationCode,
  message: string,
): HTMLAnchorElement {
  const link = element("a", "eye-violation-link", message);
  link.href = violationDocsUrl(code);
  link.target = "_blank";
  link.rel = "noopener";
  link.title = "Open the documentation for this violation";
  return link;
}

function dueShiftLabel(deltaDays: number): string {
  return `Move due date 1 day ${deltaDays > 0 ? "later" : "earlier"}`;
}

function headingId(prefix: string, key: string): string {
  return `eye-${prefix}-${key.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}`;
}

function emptyMessage(mode: EyeMode): string {
  if (mode === "focus") return "Today is handled.";
  if (mode === "inbox") return "Inbox zero.";
  return `No notes in ${MODE_LABELS[mode]}.`;
}

export function renderToolbar(
  root: HTMLElement,
  ui: ScreenUiState,
  host: ScreenHost,
  contexts: readonly string[] = [],
  contextFilter = "*",
  globalContext = "*",
  counts?: BoardCounts,
): void {
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
      `eye-mode-button${mode === ui.mode ? " is-active" : ""}`,
      `Show ${MODE_LABELS[mode]}${countLabel}`,
      () => host.openMode(mode),
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
  if (ui.mode === "done") {
    toolbar.appendChild(renderDateNav(ui, host));
    toolbar.appendChild(renderShowFutureToggle(ui, host));
  }
  toolbar.appendChild(element("div", "eye-toolbar-spacer"));

  toolbar.appendChild(
    contextFilterControl(
      contexts,
      contextFilter,
      (context) => host.changeContextFilter(context),
      globalContext,
    ),
  );

  root.appendChild(toolbar);
}

function renderShowFutureToggle(
  ui: ScreenUiState,
  host: ScreenHost,
): HTMLElement {
  const active = ui.showFuture;
  const btn = button(
    `eye-mode-button${active ? " is-active" : ""}`,
    "Show unfinished tasks with a due date",
    () => host.toggleShowFuture(),
    "Unfinished",
  );
  btn.setAttribute("aria-pressed", `${active}`);
  return btn;
}

function renderDateNav(ui: ScreenUiState, host: ScreenHost): HTMLElement {
  const nav = element("div", "eye-date-nav");

  const prev = button("eye-icon-button", "Previous day", () =>
    host.shiftDate(-1),
  );
  setIcon(prev, "chevron-left");
  nav.appendChild(prev);

  const input = element("input", "eye-date-input");
  input.type = "date";
  input.value = ui.date;
  input.setAttribute("aria-label", "Completion date");
  input.addEventListener("change", () => {
    host.changeDate(input.value);
  });
  nav.appendChild(input);

  const next = button("eye-icon-button", "Next day", () => host.shiftDate(1));
  setIcon(next, "chevron-right");
  nav.appendChild(next);

  return nav;
}

function renderEmptyState(mode: EyeMode): HTMLElement {
  if (mode !== "focus" && mode !== "inbox") {
    return element("div", "eye-empty", emptyMessage(mode));
  }

  const state = element("div", "eye-empty eye-all-clear");
  const icon = element("span", "eye-all-clear-icon");
  icon.setAttribute("aria-hidden", "true");
  setIcon(icon, ALL_CLEAR_ICON);
  const iconSvg = icon.querySelector<SVGElement>("svg");
  iconSvg?.setAttribute("viewBox", "0 0 24 24");
  state.append(
    icon,
    element("div", "eye-all-clear-message", emptyMessage(mode)),
  );
  return state;
}

export async function renderScreen(
  root: HTMLElement,
  screen: BoardScreen,
  ui: ScreenUiState,
  host: ScreenHost,
): Promise<void> {
  const list = element("div", "eye-list");
  root.appendChild(list);

  if (screen.body.kind === "focus") {
    list.classList.add("eye-focus-list");
    for (const item of screen.body.items) await renderItem(list, item, host);
    if (screen.isEmpty) list.appendChild(renderEmptyState(ui.mode));
    return;
  }

  if (screen.body.kind === "buckets") {
    list.classList.add("eye-tree");
    for (const bucket of screen.body.buckets) {
      await renderBucket(list, bucket, ui, host);
    }
    if (screen.isEmpty) list.appendChild(renderEmptyState(ui.mode));
    return;
  }

  list.classList.add("eye-completed-list");
  for (const context of screen.body.contexts) {
    await renderDoneContext(list, context, host);
  }
  if (screen.isEmpty) {
    list.appendChild(
      element(
        "div",
        "eye-empty",
        `No completed tasks for ${screen.body.dateLabel}.`,
      ),
    );
  }
}

async function renderDoneContext(
  list: HTMLElement,
  context: DoneContextGroup,
  host: ScreenHost,
): Promise<void> {
  const header = element("div", "eye-bucket-header eye-completed-header");
  header.appendChild(
    element("span", "eye-bucket-count", `${context.matchedCount}`),
  );
  const label = element("h2", "eye-bucket-label", context.context);
  label.id = completedContextId(context.context);
  header.appendChild(label);
  list.appendChild(header);

  for (const group of context.groups) {
    await renderStatusNote(list, group, host);
  }
}

async function renderStatusNote(
  list: HTMLElement,
  group: StatusNoteGroup,
  host: ScreenHost,
): Promise<void> {
  const row = element("div", "eye-completed-file");
  const header = element("div", "eye-completed-file-header");
  header.appendChild(renderCompletedNoteLink(group, host));
  header.appendChild(element("span", "eye-day-count", `${group.matchedCount}`));
  row.appendChild(header);

  const taskList = element("div", "eye-completed-tasks");
  for (const node of group.nodes) {
    await renderStatusNode(taskList, node, group.filePath, host);
  }
  row.appendChild(taskList);

  list.appendChild(row);
}

function renderCompletedNoteLink(
  group: StatusNoteGroup,
  host: ScreenHost,
): HTMLAnchorElement {
  const link = element("a", "eye-note-link", group.fileName);
  link.href = "#";
  link.addEventListener("click", (event) => {
    event.preventDefault();
    if (group.filePath) host.openFile(group.filePath);
  });
  return link;
}

async function renderStatusNode(
  list: HTMLElement,
  node: StatusTaskNode,
  filePath: string,
  host: ScreenHost,
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
  await host.renderMarkdown(body, node.text, filePath);
  unwrapSingleParagraph(body);
  row.appendChild(body);

  list.appendChild(row);

  if (node.children.length > 0) {
    const children = element("div", "eye-completed-children");
    for (const child of node.children) {
      await renderStatusNode(children, child, filePath, host);
    }
    list.appendChild(children);
  }
}

async function renderBucket(
  list: HTMLElement,
  bucket: BoardBucket,
  ui: ScreenUiState,
  host: ScreenHost,
): Promise<void> {
  const collapsed = ui.collapse.isCollapsed(ui.mode, bucket.key);
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
  label.id = headingId("bucket", `${ui.mode}-${bucket.key}`);

  const children = element("div", "eye-bucket-children tree-item-children");
  children.id = `${label.id}-children`;
  children.hidden = collapsed;
  header.setAttribute("aria-controls", children.id);

  const collapseIcon = element("span", "eye-collapse-icon");
  setBucketCollapseIcon(collapseIcon, collapsed);
  header.appendChild(collapseIcon);
  header.appendChild(label);
  header.appendChild(
    element("span", "eye-bucket-count", `${bucket.taskCount}`),
  );

  const toggleBucket = () => {
    const nextCollapsed = ui.collapse.toggle(ui.mode, bucket.key);
    group.classList.toggle("is-collapsed", nextCollapsed);
    children.hidden = nextCollapsed;
    header.setAttribute("aria-expanded", `${!nextCollapsed}`);
    setBucketCollapseIcon(collapseIcon, nextCollapsed);
  };

  header.addEventListener("click", toggleBucket);
  header.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleBucket();
  });

  group.appendChild(header);

  const showDays = shouldShowDayDividers(bucket);
  for (const day of bucket.days) {
    if (showDays) renderDayDivider(children, day);
    for (const item of day.items) {
      await renderItem(children, item, host);
    }
  }

  group.appendChild(children);
  list.appendChild(group);
}

function setBucketCollapseIcon(icon: HTMLElement, collapsed: boolean): void {
  icon.replaceChildren();
  setIcon(icon, collapsed ? "chevron-right" : "chevron-down");
}

function shouldShowDayDividers(bucket: BoardBucket): boolean {
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

function renderDayDivider(list: HTMLElement, day: BoardDayGroup): void {
  const divider = element("div", "eye-day-divider");
  const label = element("h3", "eye-day-label", day.label);
  label.id = headingId("day", day.key);
  divider.appendChild(label);
  divider.appendChild(element("span", "eye-day-count", `${day.taskCount}`));
  list.appendChild(divider);
}

async function renderItem(
  list: HTMLElement,
  item: RenderItem,
  host: ScreenHost,
): Promise<void> {
  if (item.kind === "task") {
    await renderRow(list, item.model, host);
  } else {
    renderMarker(list, item.marker);
  }
}

function renderMarker(list: HTMLElement, marker: VacationMarker): void {
  const row = element("div", "eye-row eye-marker");
  const main = element("div", "eye-row-main");
  const title = element("div", "eye-row-title", marker.label);
  main.appendChild(title);
  row.appendChild(main);
  row.appendChild(renderMarkerBadge(marker));
  list.appendChild(row);
}

function renderMarkerBadge(marker: VacationMarker): HTMLElement {
  const badge = element("div", "eye-context-badge eye-marker-badge", "OOO");
  badge.title = marker.label;
  badge.setAttribute("aria-label", `OOO marker: ${marker.label}`);
  return badge;
}

function renderContextBadge(model: RowModel): HTMLElement {
  const rail = element("div", "eye-context-badge", model.contextLabel);
  rail.dataset.eyeContext = model.contextKey;
  rail.title = model.contextLabel;
  rail.setAttribute("aria-label", `Context: ${model.contextLabel}`);
  return rail;
}

function renderNoteLink(model: RowModel, host: ScreenHost): HTMLAnchorElement {
  const link = element("a", "eye-note-link", model.file.basename);
  link.href = "#";
  link.addEventListener("click", (event) => {
    event.preventDefault();
    host.openFile(model.file.path);
  });
  return link;
}

function applyPriority(row: HTMLElement, model: RowModel): void {
  const priority = model.earliestTask?.priority ?? NORMAL_PRIORITY;
  row.dataset.eyePriority = String(priority);
  const classes = priorityRowClasses(priority);
  if (classes.length > 0) row.classList.add(...classes);
}

async function renderRow(
  list: HTMLElement,
  model: RowModel,
  host: ScreenHost,
): Promise<void> {
  const row = element("div", "eye-row eye-task-row");
  applyPriority(row, model);
  const noteLine = element("div", "eye-note-line");
  const actionCell = element("div", "eye-action-cell");
  const action = element("div", "eye-task-title");
  await renderActionMarkdown(action, model, host);

  actionCell.appendChild(action);
  if (model.errors.length > 0) actionCell.appendChild(attentionPill());
  noteLine.appendChild(renderNoteLink(model, host));
  noteLine.appendChild(renderContextBadge(model));

  const actionLine = element("div", "eye-action-line");
  actionLine.appendChild(element("span", "eye-row-separator", "→"));
  actionLine.appendChild(actionCell);

  const errors = model.errors.length > 0 ? element("div", "eye-errors") : null;
  if (errors) {
    for (const violation of model.errors) {
      const error = element("div", undefined);
      error.dataset.eyeViolation = violation.code;
      error.appendChild(renderViolationLink(violation.code, violation.message));
      errors.appendChild(error);
    }
  }

  row.appendChild(noteLine);
  row.appendChild(actionLine);
  if (errors) row.appendChild(errors);
  row.appendChild(renderActions(model, host));
  list.appendChild(row);
}

async function renderActionMarkdown(
  action: HTMLElement,
  model: RowModel,
  host: ScreenHost,
): Promise<void> {
  await host.renderMarkdown(action, model.actionLabel, model.file.path);
  unwrapSingleParagraph(action);
}

function renderActions(model: RowModel, host: ScreenHost): HTMLElement {
  const actions = element("div", "eye-actions");
  const task = model.earliestTask;
  if (!task) return actions;

  const done = button("eye-icon-button", "Mark task done", () =>
    host.editTask(model, { kind: "done" }),
  );
  setIcon(done, "check");
  actions.appendChild(done);

  if (model.earliestDue !== null) {
    for (const delta of [-1, 1]) {
      actions.appendChild(
        button(
          "eye-shift-button",
          dueShiftLabel(delta),
          () => host.editTask(model, { kind: "shift", days: delta }),
          delta > 0 ? `+${delta}` : `${delta}`,
        ),
      );
    }
  }

  const raise = button(
    "eye-shift-button",
    "Raise task priority",
    () =>
      host.editTask(model, {
        kind: "priority",
        direction: "raise",
      }),
    "↑",
  );
  raise.disabled = !canRaisePriority(task.priority);
  actions.appendChild(raise);

  const lower = button(
    "eye-shift-button",
    "Lower task priority",
    () =>
      host.editTask(model, {
        kind: "priority",
        direction: "lower",
      }),
    "↓",
  );
  lower.disabled = !canLowerPriority(task.priority);
  actions.appendChild(lower);

  return actions;
}
