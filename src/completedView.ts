import { ItemView, MarkdownRenderer, setIcon } from "obsidian";
import type { ViewStateResult, WorkspaceLeaf } from "obsidian";
import {
  collectCompletedTasks,
  datePrefix,
  groupCompletedTasks,
} from "./dailyCore";
import type { CompletedTask } from "./dailyCore";
import {
  formatContextLabel,
  matchesContextFilter,
  normalizeContextFilter,
} from "./context";
import { formatHumanDate, shiftIsoDate, todayIso } from "./date";
import type TheEyePlugin from "./main";
import { button, element, unwrapSingleParagraph } from "./ui";

export const COMPLETED_VIEW_TYPE = "obsidian-tasks-eye-completed-view";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && DATE_RE.test(value);
}

function fileTaskCount(files: Record<string, CompletedTask[]>): number {
  return Object.values(files).reduce(
    (sum, tasks) => sum + tasks.length,
    0,
  );
}

function contextId(context: string): string {
  return `eye-completed-${context.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}`;
}

export function dateFromDailyPath(path: string): string | null {
  const name = path.split("/").pop() ?? "";
  return datePrefix(name);
}

export class CompletedTasksView extends ItemView {
  private plugin: TheEyePlugin;
  private date: string;
  private renderToken = 0;

  constructor(leaf: WorkspaceLeaf, plugin: TheEyePlugin) {
    super(leaf);
    this.plugin = plugin;
    this.date = todayIso();
    this.navigation = true;
  }

  getViewType(): string {
    return COMPLETED_VIEW_TYPE;
  }

  getDisplayText(): string {
    return `Tasks Eye Done: ${this.date}`;
  }

  getIcon(): string {
    return "check-check";
  }

  getState(): Record<string, unknown> {
    return { ...super.getState(), date: this.date };
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    await super.setState(state, result);
    if (
      typeof state === "object" && state !== null && "date" in state &&
      isIsoDate((state as { date: unknown }).date)
    ) {
      this.date = (state as { date: string }).date;
    }
  }

  protected async onOpen(): Promise<void> {
    await this.requestRender();
  }

  protected async onClose(): Promise<void> {
    this.contentEl.replaceChildren();
  }

  async setDate(date: string): Promise<void> {
    if (!isIsoDate(date) || date === this.date) return;
    this.date = date;
    await this.requestRender();
  }

  async shiftDate(deltaDays: number): Promise<void> {
    await this.setDate(shiftIsoDate(this.date, deltaDays));
  }

  async requestRender(): Promise<void> {
    const token = ++this.renderToken;
    const root = element("div", "eye-plugin eye-completed-view");
    this.contentEl.replaceChildren(root);
    this.renderToolbar(root, []);
    root.appendChild(element("div", "eye-empty", "Loading..."));

    const files = await this.plugin.readFiles();
    if (token !== this.renderToken) return;

    const contexts = this.plugin.discoverContexts(files);
    const contextFilter = normalizeContextFilter(
      this.plugin.settings.contextFilter,
      contexts,
    );

    root.replaceChildren();
    const tasks = collectCompletedTasks(files, this.date)
      .filter((task) => matchesContextFilter(task.filePath, contextFilter));
    this.renderToolbar(root, contexts, contextFilter);

    const list = element("div", "eye-list eye-completed-list");
    root.appendChild(list);

    if (tasks.length === 0) {
      list.appendChild(element(
        "div",
        "eye-empty",
        `No completed tasks for ${formatHumanDate(this.date)}`,
      ));
      return;
    }

    await this.renderGroups(list, tasks);
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
    input.value = this.date;
    input.addEventListener("change", () => {
      void this.setDate(input.value);
    });
    nav.appendChild(input);

    nav.appendChild(button(
      "eye-mode-button",
      "Show today",
      () => void this.setDate(todayIso()),
      "Today",
    ));

    const next = button(
      "eye-icon-button",
      "Next day",
      () => void this.shiftDate(1),
    );
    setIcon(next, "chevron-right");
    nav.appendChild(next);

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

  private async renderGroups(
    list: HTMLElement,
    tasks: CompletedTask[],
  ): Promise<void> {
    const grouped = groupCompletedTasks(tasks);

    for (const context of Object.keys(grouped).sort()) {
      const files = grouped[context] ?? {};
      const header = element("div", "eye-bucket-header eye-completed-header");
      header.appendChild(element(
        "span",
        "eye-bucket-count",
        `${fileTaskCount(files)}`,
      ));
      const label = element("h2", "eye-bucket-label", context);
      label.id = contextId(context);
      header.appendChild(label);
      list.appendChild(header);

      for (const [fileName, fileTasks] of Object.entries(files).sort()) {
        await this.renderFileGroup(list, fileName, fileTasks);
      }
    }
  }

  private async renderFileGroup(
    list: HTMLElement,
    fileName: string,
    tasks: CompletedTask[],
  ): Promise<void> {
    const row = element("div", "eye-completed-file");
    const header = element("div", "eye-completed-file-header");
    header.appendChild(this.renderNoteLink(fileName, tasks[0]?.filePath ?? ""));
    header.appendChild(element("span", "eye-day-count", `${tasks.length}`));
    row.appendChild(header);

    const taskList = element("div", "eye-completed-tasks");
    for (const task of tasks) await this.renderTask(taskList, task);
    row.appendChild(taskList);

    list.appendChild(row);
  }

  private renderNoteLink(
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

  private async renderTask(
    list: HTMLElement,
    task: CompletedTask,
  ): Promise<void> {
    const row = element("div", "eye-completed-task");
    const icon = element("span", "eye-completed-check");
    setIcon(icon, "check");
    row.appendChild(icon);

    const body = element("div", "eye-completed-task-text");
    await MarkdownRenderer.render(this.app, task.text, body, task.filePath, this);
    unwrapSingleParagraph(body);
    row.appendChild(body);

    list.appendChild(row);
  }
}
