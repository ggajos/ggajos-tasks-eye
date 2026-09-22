import type { WorkspaceLeaf } from "obsidian";
import { ItemView, Keymap, MarkdownRenderer, TFile } from "obsidian";
import { BOARD_RENDER_FAILED_MESSAGE } from "./constants";
import type TheEyePlugin from "./main";
import type { NoteTree, TreeNoteRef } from "./tree";
import { buildNoteTree, noteTreeMarkdown } from "./tree";
import { element } from "./ui";

export const TREE_VIEW_TYPE = "ggajos-tasks-eye-tree-view";

const EMPTY_TREE_MESSAGE = "Open an indexed note to see its tree.";

export class TreeView extends ItemView {
  private plugin: TheEyePlugin;
  private renderToken = 0;

  constructor(leaf: WorkspaceLeaf, plugin: TheEyePlugin) {
    super(leaf);
    this.plugin = plugin;
    this.navigation = false;
  }

  getViewType(): string {
    return TREE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Tasks Eye Tree";
  }

  getIcon(): string {
    return "list-tree";
  }

  protected async onOpen(): Promise<void> {
    await this.requestRender();
  }

  protected async onClose(): Promise<void> {
    this.contentEl.replaceChildren();
  }

  async requestRender(): Promise<void> {
    const token = ++this.renderToken;
    const root = element("div", "eye-note-tree");
    this.contentEl.replaceChildren(root);

    const folderError = this.plugin.managedFolderError();
    if (folderError) {
      root.appendChild(element("div", "eye-error", folderError));
      return;
    }

    try {
      const files = await this.plugin.readFiles();
      if (token !== this.renderToken) return;
      const activePath =
        this.plugin.app.workspace.getActiveFile()?.path ?? null;
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
    const markdown = noteTreeMarkdown(tree, (ref) =>
      this.linkTextFor(ref, sourcePath),
    );
    const body = element("div", "markdown-rendered");
    root.appendChild(body);
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
    await MarkdownRenderer.render(
      this.plugin.app,
      markdown,
      body,
      sourcePath,
      this,
    );
    body
      .querySelectorAll<HTMLAnchorElement>("a.internal-link")
      .forEach((link) => {
        link.title = link.textContent ?? "";
      });
  }

  private linkTextFor(ref: TreeNoteRef, sourcePath: string): string {
    const file = this.plugin.app.vault.getAbstractFileByPath(ref.path);
    if (file instanceof TFile) {
      return this.plugin.app.metadataCache.fileToLinktext(file, sourcePath);
    }
    return ref.path.replace(/\.md$/i, "");
  }
}
