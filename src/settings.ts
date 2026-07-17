import type { App } from "obsidian";
import { FuzzySuggestModal, PluginSettingTab, Setting } from "obsidian";
import type TheEyePlugin from "./main";
import { collectDescendantFolders } from "./managedFolder";
import { DEFAULT_MANAGED_FOLDER_PATH } from "./managedPath";

interface FolderOption {
  path: string;
}

class ManagedFolderSuggestModal extends FuzzySuggestModal<FolderOption> {
  private readonly options: FolderOption[];
  private readonly onChoose: (option: FolderOption) => void;

  constructor(
    app: App,
    options: FolderOption[],
    onChoose: (option: FolderOption) => void,
  ) {
    super(app);
    this.options = options;
    this.onChoose = onChoose;
    this.setPlaceholder("Choose a notes folder");
  }

  getItems(): FolderOption[] {
    return this.options;
  }

  getItemText(item: FolderOption): string {
    return item.path;
  }

  onChooseItem(item: FolderOption): void {
    this.onChoose(item);
  }
}

export class TasksEyeSettingTab extends PluginSettingTab {
  private readonly plugin: TheEyePlugin;

  constructor(app: App, plugin: TheEyePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Notes folder")
      .setDesc(
        "Tasks Eye reads Markdown notes in this folder and all subfolders.",
      )
      .addButton((button) => {
        button
          .setButtonText(this.plugin.settings.notesFolderPath)
          .setTooltip("Choose a notes folder")
          .onClick(() => this.openFolderPicker());
      });

    const error = this.plugin.managedFolderError();
    if (error) {
      containerEl.createDiv({
        cls: "eye-setting-warning",
        text: error,
      });
    }
  }

  private openFolderPicker(): void {
    const options: FolderOption[] = [
      { path: DEFAULT_MANAGED_FOLDER_PATH },
      ...collectDescendantFolders(this.app.vault.getRoot())
        .map((folder) => ({ path: folder.path }))
        .sort((a, b) => a.path.localeCompare(b.path)),
    ];

    new ManagedFolderSuggestModal(this.app, options, (option) => {
      void this.plugin
        .setNotesFolderPath(option.path)
        .then(() => this.display());
    }).open();
  }
}
