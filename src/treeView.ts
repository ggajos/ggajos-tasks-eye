import type { WorkspaceLeaf } from "obsidian";
import { ItemView, Keymap, MarkdownRenderer, setIcon, TFile } from "obsidian";
import { BOARD_RENDER_FAILED_MESSAGE } from "./constants";
import type TheEyePlugin from "./main";
import type { NoteTree, TreeNoteRef } from "./tree";
import {
  buildNoteTree,
  collapsedTreePaths,
  expandTreeLevel,
  filterClosedDescendants,
  noteTreeRows,
} from "./tree";
import { button, element, unwrapSingleParagraph } from "./ui";

export const TREE_VIEW_TYPE = "ggajos-tasks-eye-tree-view";

const EMPTY_TREE_MESSAGE = "Open an indexed note to see its tree.";

export class TreeView extends ItemView {
  private plugin: TheEyePlugin;
  private renderToken = 0;
  private activePath: string | null = null;
  private collapsed = new Set<string>();
  private hideClosed = true;

  constructor(leaf: WorkspaceLeaf, plugin: TheEyePlugin) {
    super(leaf);
    this.plugin = plugin;
    this.navigation = false;
  }

  getViewType(): string {
    return TREE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Tasks Eye tree";
  }

  getIcon(): string {
    return "list-tree";
  }

  protected async onOpen(): Promise<void> {
    this.hideClosed = true;
    this.activePath = null;
    this.collapsed.clear();
    await this.requestRender();
  }

  protected async onClose(): Promise<void> {
    ++this.renderToken;
    this.activePath = null;
    this.collapsed.clear();
    this.contentEl.replaceChildren();
  }

  async requestRender(): Promise<void> {
    const token = ++this.renderToken;
    const root = element("div", "eye-note-tree");
    this.contentEl.replaceChildren(root);

    const folderError = this.plugin.preferences.managedFolderError();
    if (folderError) {
      root.appendChild(element("div", "eye-error", folderError));
      return;
    }

    try {
      const { files } = await this.plugin.snapshot();
      if (token !== this.renderToken) return;
      const activePath =
        this.plugin.app.workspace.getActiveFile()?.path ?? null;
      if (activePath !== this.activePath) {
        this.activePath = activePath;
        this.collapsed.clear();
      }
      const tree = buildNoteTree(activePath, files);
      if (!tree) {
        root.appendChild(element("div", "eye-empty", EMPTY_TREE_MESSAGE));
        return;
      }
      await this.renderTree(root, tree, activePath ?? "");
    } catch (error) {
      if (token !== this.renderToken) return;
      console.error("Tasks Eye failed to render the tree.", error);
      root.appendChild(
        element("div", "eye-error", BOARD_RENDER_FAILED_MESSAGE),
      );
    }
  }

  private async renderTree(
    root: HTMLElement,
    tree: NoteTree,
    sourcePath: string,
  ): Promise<void> {
    const toolbar = element("div", "eye-tree-toolbar");
    toolbar.setAttribute("role", "group");
    toolbar.setAttribute("aria-label", "Tree controls");
    root.appendChild(toolbar);
    const body = element("div", "eye-tree-body");
    root.appendChild(body);
    const displayedTree = this.hideClosed
      ? filterClosedDescendants(tree)
      : tree;
    const rows = noteTreeRows(displayedTree);
    const elements = new Map<
      string,
      {
        row: HTMLElement;
        toggle?: HTMLButtonElement;
      }
    >();
    const actions: HTMLButtonElement[] = [];
    const update = (): void => {
      const state = noteTreeRows(displayedTree, this.collapsed);
      for (const ref of state) {
        const entry = elements.get(ref.path);
        if (!entry) continue;
        entry.row.hidden = !ref.visible;
        if (entry.toggle) {
          const expanded = !this.collapsed.has(ref.path);
          entry.toggle.setAttribute("aria-expanded", String(expanded));
          const label = `${expanded ? "Collapse" : "Expand"} ${ref.basename}`;
          entry.toggle.setAttribute("aria-label", label);
          entry.toggle.title = label;
          setIcon(entry.toggle, expanded ? "chevron-down" : "chevron-right");
        }
      }
      const branches = state.filter((ref) => ref.children.length > 0);
      const disabled = [
        !branches.some((ref) => this.collapsed.has(ref.path)),
        branches.length === 0 ||
          branches.every((ref) => this.collapsed.has(ref.path)),
        !branches.some((ref) => ref.visible && this.collapsed.has(ref.path)),
      ];
      actions.forEach((action, index) => {
        action.disabled = disabled[index] ?? true;
      });
    };
    for (const [title, icon, change] of [
      ["Expand all", "unfold-vertical", () => this.collapsed.clear()],
      [
        "Collapse all",
        "fold-vertical",
        () => {
          this.collapsed = collapsedTreePaths(tree);
        },
      ],
      [
        "Expand one level",
        "list-plus",
        () => {
          this.collapsed = expandTreeLevel(displayedTree, this.collapsed);
        },
      ],
    ] as const) {
      const control = button("eye-tree-control clickable-icon", title, () => {
        change();
        update();
      });
      setIcon(control, icon);
      toolbar.appendChild(control);
      actions.push(control);
    }
    const closedFilter = button(
      "eye-tree-control eye-tree-closed-filter clickable-icon",
      "Hide closed notes",
      () => {
        this.hideClosed = !this.hideClosed;
        void this.requestRender().then(() => {
          this.contentEl
            .querySelector<HTMLButtonElement>(".eye-tree-closed-filter")
            ?.focus();
        });
      },
    );
    closedFilter.setAttribute("aria-pressed", String(this.hideClosed));
    setIcon(closedFilter, "list-filter");
    toolbar.appendChild(closedFilter);
    const renders: Promise<void>[] = [];
    for (const ref of rows) {
      const row = element(
        "div",
        `eye-tree-row${ref.current ? " is-current" : ""}`,
      );
      row.dataset.path = ref.path;
      row.style.setProperty("--eye-tree-depth", String(ref.depth));
      const entry: { row: HTMLElement; toggle?: HTMLButtonElement } = { row };
      if (ref.children.length > 0) {
        entry.toggle = button(
          "eye-tree-toggle clickable-icon",
          `Collapse ${ref.basename}`,
          () => {
            if (this.collapsed.has(ref.path)) this.collapsed.delete(ref.path);
            else this.collapsed.add(ref.path);
            update();
          },
        );
        row.appendChild(entry.toggle);
      } else {
        const spacer = element("span", "eye-tree-toggle-spacer");
        spacer.setAttribute("aria-hidden", "true");
        row.appendChild(spacer);
      }
      const bullet = element("span", "eye-tree-bullet", "•");
      bullet.setAttribute("aria-hidden", "true");
      row.appendChild(bullet);
      const title = element("div", "eye-tree-title markdown-rendered");
      if (ref.current)
        title.appendChild(element("strong", undefined, ref.basename));
      else {
        renders.push(
          MarkdownRenderer.render(
            this.plugin.app,
            `[[${this.linkTextFor(ref, sourcePath)}|${ref.basename}]]`,
            title,
            sourcePath,
            this,
          ).then(() => {
            unwrapSingleParagraph(title);
            title
              .querySelectorAll<HTMLAnchorElement>("a.internal-link")
              .forEach((link) => {
                link.title = ref.basename;
              });
          }),
        );
      }
      row.appendChild(title);
      body.appendChild(row);
      elements.set(ref.path, entry);
    }
    update();
    // Obsidian does not handle internal-link clicks inside a custom view.
    body.addEventListener("click", (event) => {
      const link = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "a.internal-link",
      );
      const href = link?.getAttribute("href");
      if (!href) return;
      event.preventDefault();
      void this.plugin.app.workspace.openLinkText(
        href,
        sourcePath,
        Keymap.isModEvent(event),
      );
    });
    await Promise.all(renders);
  }

  private linkTextFor(ref: TreeNoteRef, sourcePath: string): string {
    const file = this.plugin.app.vault.getAbstractFileByPath(ref.path);
    if (file instanceof TFile) {
      return this.plugin.app.metadataCache.fileToLinktext(file, sourcePath);
    }
    return ref.path.replace(/\.md$/i, "");
  }
}
