import type { WorkspaceLeaf } from "obsidian";
import { ItemView } from "obsidian";
import { BOARD_RENDER_FAILED_MESSAGE } from "./constants";
import type TheEyePlugin from "./main";
import type { NoteTree, TreeNode } from "./tree";
import { buildNoteTree } from "./tree";
import { element, internalLink } from "./ui";

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
    const root = element("div", "eye-tree");
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
      this.renderTree(root, tree);
    } catch (error) {
      if (token !== this.renderToken) return;
      console.error("Tasks Eye failed to render the tree.", error);
      root.appendChild(
        element("div", "eye-error", BOARD_RENDER_FAILED_MESSAGE),
      );
    }
  }

  private renderTree(root: HTMLElement, tree: NoteTree): void {
    const openNote = (path: string): void => {
      void this.plugin.openFile(path);
    };

    let container = root;
    for (const ref of tree.spine) {
      const node = element("div", "eye-tree-node");
      node.appendChild(internalLink(ref.basename, ref.path, openNote));
      container.appendChild(node);
      const children = element("div", "eye-tree-children");
      container.appendChild(children);
      container = children;
    }

    const current = element("div", "eye-tree-node is-current");
    current.appendChild(
      internalLink(tree.current.basename, tree.current.path, openNote),
    );
    container.appendChild(current);

    const descendants = element("div", "eye-tree-children");
    container.appendChild(descendants);
    this.renderNodes(descendants, tree.descendants, openNote);
  }

  private renderNodes(
    container: HTMLElement,
    nodes: readonly TreeNode[],
    openNote: (path: string) => void,
  ): void {
    for (const node of nodes) {
      const nodeEl = element("div", "eye-tree-node");
      nodeEl.appendChild(internalLink(node.basename, node.path, openNote));
      container.appendChild(nodeEl);
      if (node.children.length > 0) {
        const children = element("div", "eye-tree-children");
        container.appendChild(children);
        this.renderNodes(children, node.children, openNote);
      }
    }
  }
}
