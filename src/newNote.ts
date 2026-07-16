import { FuzzySuggestModal, Notice } from "obsidian";
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

async function uniquePath(
  app: App,
  folderPath: string,
): Promise<string> {
  const inFolder = (name: string) => folderPath ? `${folderPath}/${name}` : name;
  let candidate = inFolder("Untitled.md");
  let suffix = 1;
  while (await app.vault.adapter.exists(candidate)) {
    candidate = inFolder(`Untitled ${suffix}.md`);
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
    this.setPlaceholder("Choose a folder for the new note");
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

async function createNote(app: App, folderPath: string): Promise<void> {
  const path = await uniquePath(app, folderPath);
  const file = await app.vault.create(path, noteBody());
  await app.workspace.getLeaf(false).openFile(file);
}

export function openNewEyeNoteFlow(app: App, managedFolderPath: string): void {
  const options = folderOptions(app, managedFolderPath);
  if (options.length === 0) {
    new Notice(missingManagedFolderMessage(managedFolderPath));
    return;
  }

  new FolderSuggestModal(app, options, (folder) => {
    void createNote(app, folder.path);
  }).open();
}
