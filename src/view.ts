import { ItemView, setIcon } from "obsidian";
import type { ViewStateResult, WorkspaceLeaf } from "obsidian";
import { isEyeMode, MODE_LABELS, MODES } from "./constants";
import type { EyeMode } from "./constants";
import {
  discoverContexts,
  formatContextLabel,
  normalizeContextFilter,
  withVacationContext,
} from "./context";
import {
  boardItemsForContext,
  buildBoardBuckets,
  rowStateClasses,
  selectRows,
} from "./model";
import type { BoardBucket, BoardDayGroup, RenderItem } from "./model";
import { formatYmd, nowDate, nowTs } from "./date";
import type TheEyePlugin from "./main";
import type { RowModel } from "./types";
import { button, element } from "./ui";
import type { VacationMarker } from "./vacation";

export const VIEW_TYPE = "ggajos-tasks-eye-view";

function pill(text: string): HTMLElement {
  return element("span", "eye-pill", text);
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

export class EyeView extends ItemView {
  private plugin: TheEyePlugin;
  private mode: EyeMode;
  private renderToken = 0;
  private collapsedBuckets = new Set<string>();

  constructor(leaf: WorkspaceLeaf, plugin: TheEyePlugin) {
    super(leaf);
    this.plugin = plugin;
    this.mode = plugin.settings.mode;
    this.navigation = true;
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return `Tasks Eye: ${MODE_LABELS[this.mode]}`;
  }

  getIcon(): string {
    return "eye";
  }

  getState(): Record<string, unknown> {
    return { ...super.getState(), mode: this.mode };
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    await super.setState(state, result);
    if (
      typeof state === "object" && state !== null && "mode" in state &&
      isEyeMode((state as { mode: unknown }).mode)
    ) {
      this.mode = (state as { mode: EyeMode }).mode;
      await this.plugin.setMode(this.mode);
    }
  }

  protected async onOpen(): Promise<void> {
    await this.requestRender();
  }

  protected async onClose(): Promise<void> {
    this.contentEl.replaceChildren();
  }

  async setMode(mode: EyeMode): Promise<void> {
    this.mode = mode;
    await this.plugin.setMode(mode);
    await this.requestRender();
  }

  async requestRender(): Promise<void> {
    const token = ++this.renderToken;
    const root = element("div", "eye-plugin");
    this.contentEl.replaceChildren(root);
    this.renderToolbar(root, []);
    root.appendChild(element("div", "eye-empty", "Loading..."));

    const files = await this.plugin.readFiles();
    if (token !== this.renderToken) return;

    const contexts = this.contextsForMode(discoverContexts(files));
    const contextFilter = normalizeContextFilter(
      this.plugin.settings.contextFilter,
      contexts,
    );

    root.replaceChildren();
    this.renderToolbar(root, contexts, contextFilter);

    if (!this.plugin.tasksApiAvailable()) {
      root.appendChild(element(
        "div",
        "eye-error",
        "Tasks Eye requires the Obsidian Tasks plugin API.",
      ));
      return;
    }

    const rows = selectRows(files, this.mode, contextFilter);
    const list = element("div", "eye-list");
    root.appendChild(list);

    if (isBoardMode(this.mode)) {
      const vacationSourceRows = this.mode === "open"
        ? selectRows(files, this.mode, "*")
        : rows;
      const rendered = await this.renderBoard(
        list,
        rows,
        vacationSourceRows,
        contextFilter,
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
    if (this.mode === "inbox") return "All files pass validation";
    return `No notes in ${MODE_LABELS[this.mode]}`;
  }

  private contextsForMode(contexts: string[]): string[] {
    return this.mode === "open" ? withVacationContext(contexts) : contexts;
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
        `eye-mode-button${mode === this.mode ? " is-active" : ""}`,
        `Show ${MODE_LABELS[mode]}`,
        () => void this.setMode(mode),
        MODE_LABELS[mode],
      );
      nav.appendChild(btn);
    }

    toolbar.appendChild(nav);
    toolbar.appendChild(element("div", "eye-toolbar-spacer"));

    const contextFilter = element("div", "eye-context-filter");
    const filterIcon = element("span", "eye-context-filter-icon");
    filterIcon.setAttribute("aria-hidden", "true");
    setIcon(filterIcon, "list-filter");
    contextFilter.appendChild(filterIcon);

    const select = element("select", "eye-context-select");
    const allOption = new Option("All", "*");
    allOption.label = "All";
    select.appendChild(allOption);
    for (const context of contexts) {
      const label = formatContextLabel(context);
      const option = new Option(label, context);
      option.label = label;
      select.appendChild(option);
    }
    select.value = activeContextFilter;
    select.addEventListener("change", () => {
      void this.plugin.setContextFilter(select.value).then(() =>
        this.requestRender()
      );
    });
    contextFilter.appendChild(select);
    toolbar.appendChild(contextFilter);

    root.appendChild(toolbar);
  }

  private async renderBoard(
    list: HTMLElement,
    rows: RowModel[],
    vacationSourceRows: RowModel[],
    contextFilter: string,
  ): Promise<boolean> {
    list.classList.add("eye-tree");

    const items = this.mode === "open"
      ? boardItemsForContext(rows, vacationSourceRows, contextFilter)
      : rows.map((model): RenderItem => ({ kind: "task", model }));
    const buckets = buildBoardBuckets(items, nowDate());

    for (const bucket of buckets) await this.renderBucket(list, bucket);
    return buckets.length > 0;
  }

  private async renderBucket(
    list: HTMLElement,
    bucket: BoardBucket,
  ): Promise<void> {
    const stateKey = this.bucketStateKey(bucket.key);
    const collapsed = this.collapsedBuckets.has(stateKey);
    const group = element("section", "eye-bucket tree-item");
    if (collapsed) group.classList.add("is-collapsed");

    const header = element("div", "eye-bucket-header tree-item-self");
    header.tabIndex = 0;
    header.setAttribute("role", "treeitem");
    header.setAttribute("aria-expanded", `${!collapsed}`);

    const label = element("span", "eye-bucket-label tree-item-inner", bucket.label);
    label.id = headingId("bucket", `${this.mode}-${bucket.key}`);

    const children = element("div", "eye-bucket-children tree-item-children");
    children.id = `${label.id}-children`;
    children.hidden = collapsed;
    header.setAttribute("aria-controls", children.id);

    const collapseIcon = element("span", "eye-collapse-icon");
    this.setBucketCollapseIcon(collapseIcon, collapsed);
    header.appendChild(collapseIcon);
    header.appendChild(label);
    header.appendChild(element(
      "span",
      "eye-bucket-count",
      `${bucket.taskCount}`,
    ));

    const toggleBucket = () => {
      const nextCollapsed = !group.classList.contains("is-collapsed");
      group.classList.toggle("is-collapsed", nextCollapsed);
      children.hidden = nextCollapsed;
      header.setAttribute("aria-expanded", `${!nextCollapsed}`);
      this.setBucketCollapseIcon(collapseIcon, nextCollapsed);

      if (nextCollapsed) this.collapsedBuckets.add(stateKey);
      else this.collapsedBuckets.delete(stateKey);
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
      for (const item of day.items) await this.renderItem(children, item, true);
    }

    group.appendChild(children);
    list.appendChild(group);
  }

  private bucketStateKey(bucketKey: string): string {
    return `${this.mode}:${bucketKey}`;
  }

  private setBucketCollapseIcon(
    icon: HTMLElement,
    collapsed: boolean,
  ): void {
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

  private renderItem(
    list: HTMLElement,
    item: RenderItem,
    taskFirst: boolean,
  ): Promise<void> {
    if (item.kind === "task") return this.renderRow(list, item.model, taskFirst);
    else this.renderMarker(list, item.marker);
    return Promise.resolve();
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
    badge.title = marker.reason;
    badge.setAttribute("aria-label", `Marker: ${marker.reason}`);
    return badge;
  }

  private renderContextBadge(model: RowModel): HTMLElement {
    const rail = element(
      "div",
      "eye-context-badge",
      model.contextLabel,
    );
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

  private renderActionLabel(
    el: HTMLElement,
    model: RowModel,
  ): void {
    el.textContent = model.actionLabel;
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
      if (model.errors.length > 0) note.appendChild(pill("!"));
      appendMeta(meta, model, false);
      this.renderActionLabel(action, model);

      main.appendChild(action);
      main.appendChild(note);
    } else {
      const title = element("div", "eye-row-title");
      title.appendChild(this.renderNoteLink(model));
      if (model.errors.length > 0) title.appendChild(pill("!"));

      main.appendChild(title);

      if (model.earliestTask) {
        const action = element("div", "eye-action");
        appendMeta(meta, model, true);
        this.renderActionLabel(action, model);
        main.appendChild(action);
      }
    }

    if (meta.childNodes.length > 0) main.appendChild(meta);

    if (model.errors.length > 0) {
      const errors = element("div", "eye-errors");
      for (const err of model.errors) {
        errors.appendChild(element("div", undefined, err));
      }
      main.appendChild(errors);
    }

    row.appendChild(main);
    row.appendChild(this.renderContextBadge(model));
    row.appendChild(this.renderActions(model));
    list.appendChild(row);
  }

  private renderActions(model: RowModel): HTMLElement {
    const actions = element("div", "eye-actions");
    const task = model.earliestTask;
    if (!task) return actions;

    const done = button(
      "eye-icon-button",
      "Complete task",
      () => void this.plugin.completeTask(model),
    );
    setIcon(done, "check");
    actions.appendChild(done);

    if (model.earliestDue !== null) {
      for (const delta of [1, -1, 7, -7]) {
        actions.appendChild(button(
          "eye-shift-button",
          `Shift due date ${delta > 0 ? "+" : ""}${delta} day(s)`,
          () => void this.plugin.shiftTaskDue(model, delta),
          delta > 0 ? `+${delta}` : `${delta}`,
        ));
      }
    }

    return actions;
  }
}
