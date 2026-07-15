import { FuzzySuggestModal, Modal, Notice, Setting } from "obsidian";
import type { App } from "obsidian";
import { getContextFromFolderPath } from "./context";
import {
  collectDescendantFolders,
  findManagedFolder,
} from "./managedFolder";
import {
  missingManagedFolderMessage,
  vaultFolderPath,
} from "./managedPath";

interface FolderOption {
  text: string;
  path: string;
}

function folderOptions(
  app: App,
  managedFolderPath: string,
): FolderOption[] {
  const root = findManagedFolder(app, managedFolderPath);
  if (!root) return [];

  const options = collectDescendantFolders(root)
    .map((folder) => ({
      text: getContextFromFolderPath(folder.path, managedFolderPath),
      path: folder.path,
    }))
    .sort((a, b) => a.text.localeCompare(b.text));
  return [
    { text: "- (root)", path: vaultFolderPath(managedFolderPath) },
    ...options,
  ];
}

function noteBody(): string {
  const lines = [
    "---",
    "status: open",
  ];
  lines.push("---", "");
  return lines.join("\n");
}

function safeFileName(title: string): string {
  return title
    .replace(/[\\/:|#^[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function uniquePath(
  app: App,
  folderPath: string,
  title: string,
): Promise<string> {
  const base = safeFileName(title) || "Untitled";
  const inFolder = (name: string) => folderPath ? `${folderPath}/${name}` : name;
  let candidate = inFolder(`${base}.md`);
  let suffix = 1;
  while (await app.vault.adapter.exists(candidate)) {
    candidate = inFolder(`${base} ${suffix}.md`);
    suffix++;
  }
  return candidate;
}

class FolderSuggestModal extends FuzzySuggestModal<FolderOption> {
  private options: FolderOption[];
  private onChoose: (option: FolderOption) => void;

  constructor(
    app: App,
    options: FolderOption[],
    onChoose: (option: FolderOption) => void,
  ) {
    super(app);
    this.options = options;
    this.onChoose = onChoose;
    this.setPlaceholder("Select Tasks Eye folder");
  }

  getItems(): FolderOption[] {
    return this.options;
  }

  getItemText(item: FolderOption): string {
    return item.text;
  }

  onChooseItem(item: FolderOption): void {
    this.onChoose(item);
  }
}

class TitleModal extends Modal {
  private folderPath: string;

  constructor(app: App, folderPath: string) {
    super(app);
    this.folderPath = folderPath;
  }

  onOpen(): void {
    this.titleEl.setText("New Tasks Eye note");
    const { contentEl } = this;
    contentEl.empty();

    let title = "";
    new Setting(contentEl)
      .setName("Title")
      .addText((text) => {
        text.setPlaceholder("Note title");
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void this.create(title);
          }
        });
        text.onChange((value) => {
          title = value;
        });
      });

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText("Create")
          .setCta()
          .onClick(() => {
            void this.create(title);
          });
      });
  }

  private async create(title: string): Promise<void> {
    const trimmed = safeFileName(title);
    if (!trimmed) {
      new Notice("Tasks Eye: note title is required.");
      return;
    }

    const path = await uniquePath(this.app, this.folderPath, trimmed);
    const file = await this.app.vault.create(path, noteBody());
    await this.app.workspace.getLeaf(false).openFile(file);
    this.close();
  }
}

export function openNewEyeNoteFlow(app: App, managedFolderPath: string): void {
  const options = folderOptions(app, managedFolderPath);
  if (options.length === 0) {
    new Notice(missingManagedFolderMessage(managedFolderPath));
    return;
  }

  new FolderSuggestModal(app, options, (folder) => {
    new TitleModal(app, folder.path).open();
  }).open();
}
