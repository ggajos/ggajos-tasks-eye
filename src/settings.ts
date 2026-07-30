import type { App, DropdownComponent, TextComponent } from "obsidian";
import { FuzzySuggestModal, PluginSettingTab, Setting } from "obsidian";
import { isIsoDate } from "./date";
import type TheEyePlugin from "./main";
import { collectDescendantFolders } from "./managedFolder";
import { DEFAULT_MANAGED_FOLDER_PATH } from "./managedPath";
import type { PersonalTimeOff } from "./vacation";

interface FolderOption {
  path: string;
}

const WEEKDAYS = [
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
  { day: 0, label: "Sunday" },
] as const;

class ManagedFolderSuggestModal extends FuzzySuggestModal<FolderOption> {
  constructor(
    app: App,
    private readonly options: FolderOption[],
    private readonly onChoose: (option: FolderOption) => void,
  ) {
    super(app);
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
  private holidayCountryDropdown: DropdownComponent | null = null;
  private holidayStatusEl: HTMLElement | null = null;
  private requestedCountries = false;
  private visible = false;

  constructor(
    app: App,
    private readonly eyePlugin: TheEyePlugin,
  ) {
    super(app, eyePlugin);
  }

  display(): void {
    this.visible = true;
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("eye-settings");
    this.holidayCountryDropdown = null;
    this.holidayStatusEl = null;
    this.requestCountries();

    new Setting(containerEl)
      .setName("Notes folder")
      .setDesc(
        "Tasks Eye reads Markdown notes in this folder and all subfolders.",
      )
      .addButton((button) => {
        button
          .setButtonText(this.eyePlugin.settings.notesFolderPath)
          .setTooltip("Choose a notes folder")
          .onClick(() => this.openFolderPicker());
      });

    const folderError = this.eyePlugin.managedFolderError();
    if (folderError) {
      containerEl.createDiv({
        cls: "eye-setting-warning",
        text: folderError,
      });
    }

    new Setting(containerEl).setName("Availability").setHeading();
    this.renderPublicHolidays();
    this.renderWeekdays();
    this.renderPersonalTimeOff();
  }

  refresh(): void {
    if (!this.visible) return;
    this.refreshHolidayCountryDropdown();
    if (this.holidayStatusEl) {
      this.holidayStatusEl.textContent = this.eyePlugin.holidaySyncStatus();
    }
  }

  hide(): void {
    this.visible = false;
  }

  private renderPublicHolidays(): void {
    const { containerEl } = this;
    new Setting(containerEl).setName("Public holidays").setHeading();

    new Setting(containerEl)
      .setName("Country")
      .setDesc(
        "Nationwide public holidays come from Nager.Date and are cached locally.",
      )
      .addDropdown((dropdown) => {
        this.holidayCountryDropdown = dropdown;
        this.refreshHolidayCountryDropdown();
        dropdown.onChange(async (countryCode) => {
          await this.eyePlugin.setHolidayCountry(countryCode);
        });
      });

    this.holidayStatusEl = containerEl.createDiv({
      cls: "setting-item-description eye-holiday-status",
      text: this.eyePlugin.holidaySyncStatus(),
    });
  }

  private renderWeekdays(): void {
    const { containerEl } = this;
    new Setting(containerEl).setName("Non-working days").setHeading();
    const setting = new Setting(containerEl)
      .setName("Every week")
      .setDesc("Select days that are normally unavailable.");
    setting.controlEl.addClass("eye-weekdays");
    for (const { day, label } of WEEKDAYS) {
      const option = setting.controlEl.createEl("label", {
        cls: "eye-weekday",
      });
      const checkbox = option.createEl("input", { type: "checkbox" });
      checkbox.checked =
        this.eyePlugin.settings.availability.nonWorkingWeekdays.includes(day);
      checkbox.ariaLabel = label;
      checkbox.addEventListener("change", () => {
        void this.eyePlugin.setNonWorkingWeekday(day, checkbox.checked);
      });
      option.createSpan({ text: label.slice(0, 3) });
    }
  }

  private renderPersonalTimeOff(): void {
    const { containerEl } = this;
    new Setting(containerEl).setName("Personal time off").setHeading();
    containerEl.createDiv({
      cls: "setting-item-description eye-personal-help",
      text: "Leave the end date empty for a single day. Ranges include both dates.",
    });

    const entries = this.eyePlugin.settings.availability.personalTimeOff;
    if (entries.length === 0) {
      containerEl.createDiv({
        cls: "setting-item-description eye-personal-empty",
        text: "No personal dates or ranges.",
      });
    }

    for (const entry of entries) this.renderPersonalEntry(entry);

    new Setting(containerEl)
      .setName("Add personal time off")
      .addButton((button) => {
        button
          .setButtonText("Add")
          .setCta()
          .onClick(async () => {
            await this.eyePlugin.addPersonalTimeOff();
            this.display();
          });
      });
  }

  private renderPersonalEntry(entry: PersonalTimeOff): void {
    const dateLabel = entry.to ? `${entry.from} — ${entry.to}` : entry.from;
    const setting = new Setting(this.containerEl)
      .setClass("eye-personal-entry")
      .setName(dateLabel)
      .setDesc(entry.label || "Vacation");

    setting.addText((start) => {
      this.dateInput(start, entry.from, "Start date");
      start.onChange(async (value) => {
        if (!isIsoDate(value) || (entry.to && entry.to < value)) {
          start.setValue(entry.from);
          return;
        }
        await this.eyePlugin.updatePersonalTimeOff(entry.id, { from: value });
      });
    });
    setting.addText((end) => {
      this.dateInput(end, entry.to ?? "", "End date (optional)");
      end.onChange(async (value) => {
        if ((value && !isIsoDate(value)) || (value && value < entry.from)) {
          end.setValue(entry.to ?? "");
          return;
        }
        await this.eyePlugin.updatePersonalTimeOff(entry.id, {
          to: value || null,
        });
      });
    });
    setting.addText((label) => {
      label
        .setPlaceholder("Vacation")
        .setValue(entry.label)
        .onChange((value) =>
          this.eyePlugin.updatePersonalTimeOff(entry.id, { label: value }),
        );
      label.inputEl.ariaLabel = "Label (optional)";
      label.inputEl.addClass("eye-personal-label");
    });
    setting.addExtraButton((button) => {
      button
        .setIcon("trash")
        .setTooltip("Delete personal time off")
        .onClick(async () => {
          await this.eyePlugin.deletePersonalTimeOff(entry.id);
          this.display();
        });
    });
  }

  private dateInput(
    component: TextComponent,
    value: string,
    label: string,
  ): void {
    component.inputEl.type = "date";
    component.inputEl.ariaLabel = label;
    component.inputEl.addClass("eye-personal-date");
    component.setValue(value);
  }

  private requestCountries(): void {
    if (this.requestedCountries) return;
    this.requestedCountries = true;
    void this.eyePlugin.refreshHolidayCountries();
  }

  private refreshHolidayCountryDropdown(): void {
    const dropdown = this.holidayCountryDropdown;
    if (!dropdown) return;

    dropdown.selectEl.replaceChildren();
    dropdown.addOption("", "Not selected");
    for (const country of this.eyePlugin.settings.holidayCache.countries) {
      dropdown.addOption(country.countryCode, country.name);
    }
    const selected = this.eyePlugin.settings.availability.countryCode;
    if (
      selected &&
      !this.eyePlugin.settings.holidayCache.countries.some(
        (country) => country.countryCode === selected,
      )
    ) {
      dropdown.addOption(selected, selected);
    }
    dropdown.setValue(selected);
  }

  private openFolderPicker(): void {
    const options: FolderOption[] = [
      { path: DEFAULT_MANAGED_FOLDER_PATH },
      ...collectDescendantFolders(this.app.vault.getRoot())
        .map((folder) => ({ path: folder.path }))
        .sort((a, b) => a.path.localeCompare(b.path)),
    ];

    new ManagedFolderSuggestModal(this.app, options, (option) => {
      void this.eyePlugin
        .setNotesFolderPath(option.path)
        .then(() => this.display());
    }).open();
  }
}
