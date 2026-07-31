import type {
  App,
  Setting,
  SettingDefinitionItem,
  TextComponent,
} from "obsidian";
import { PluginSettingTab } from "obsidian";
import { isIsoDate } from "./date";
import type TheEyePlugin from "./main";
import { DEFAULT_MANAGED_FOLDER_PATH, vaultFolderPath } from "./managedPath";
import {
  formatNonWorkingWeekdays,
  NON_WORKING_WEEKDAY_ABBREVIATIONS,
  type PersonalTimeOff,
  parseNonWorkingWeekdays,
} from "./vacation";

type SettingsControlKey =
  | "notesFolderPath"
  | "holidayCountry"
  | "nonWorkingWeekdays";

const WEEKDAY_INPUT_DESCRIPTION = `Use comma-separated abbreviations: ${NON_WORKING_WEEKDAY_ABBREVIATIONS.join(
  ", ",
)}.`;
const WEEKDAY_INPUT_ERROR =
  "Use only comma-separated weekday abbreviations: Mon, Tue, Wed, Thu, Fri, Sat, Sun.";

export class TasksEyeSettingTab extends PluginSettingTab {
  private requestedCountries = false;

  constructor(
    app: App,
    private readonly eyePlugin: TheEyePlugin,
  ) {
    super(app, eyePlugin);
  }

  getSettingDefinitions(): SettingDefinitionItem<SettingsControlKey>[] {
    const personalTimeOff =
      this.eyePlugin.settings.availability.personalTimeOff;
    return [
      {
        name: "Notes folder",
        desc: "Tasks Eye reads Markdown notes in this folder and all subfolders.",
        control: {
          type: "folder",
          key: "notesFolderPath",
          includeRoot: true,
          placeholder: DEFAULT_MANAGED_FOLDER_PATH,
          validate: (value) =>
            this.eyePlugin.managedFolderErrorFor(value) ?? undefined,
        },
      },
      {
        type: "group",
        heading: "Availability",
        cls: "eye-settings",
        items: [
          {
            name: "Public holidays",
            searchable: false,
            render: (setting) => {
              setting.setHeading();
            },
          },
          {
            name: "Country",
            desc: "Nationwide public holidays come from Nager.Date and are cached locally.",
            control: {
              type: "dropdown",
              key: "holidayCountry",
              options: this.holidayCountryOptions(),
            },
          },
          {
            name: "",
            desc: this.eyePlugin.holidaySyncStatus(),
            searchable: false,
            render: (setting) => {
              setting.setClass("eye-holiday-status");
              this.requestCountries();
            },
          },
          {
            name: "Non-working days",
            searchable: false,
            render: (setting) => {
              setting.setHeading();
            },
          },
          {
            name: "Every week",
            desc: WEEKDAY_INPUT_DESCRIPTION,
            control: {
              type: "text",
              key: "nonWorkingWeekdays",
              placeholder: "Sat, Sun",
              validate: (value) =>
                parseNonWorkingWeekdays(value) === null
                  ? WEEKDAY_INPUT_ERROR
                  : undefined,
            },
          },
        ],
      },
      {
        type: "list",
        heading: "Personal time off",
        cls: "eye-settings",
        emptyState:
          "No personal dates or ranges. Leave the end date empty for a single day. Ranges include both dates.",
        addItem: {
          name: "Add personal time off",
          action: async () => {
            await this.eyePlugin.addPersonalTimeOff();
            this.update();
          },
        },
        onDelete: async (index) => {
          const entry = personalTimeOff[index];
          if (!entry) {
            throw new Error(
              `No personal time-off entry exists at index ${index}.`,
            );
          }
          await this.eyePlugin.deletePersonalTimeOff(entry.id);
          this.update();
        },
        items: personalTimeOff.map((entry) => ({
          name: this.personalTimeOffLabel(entry),
          desc: entry.label || "Vacation",
          searchable: false,
          render: (setting) => this.renderPersonalEntry(setting, entry),
        })),
      },
    ];
  }

  getControlValue(key: string): unknown {
    switch (key) {
      case "notesFolderPath":
        return vaultFolderPath(this.eyePlugin.settings.notesFolderPath);
      case "holidayCountry":
        return this.eyePlugin.settings.availability.countryCode;
      case "nonWorkingWeekdays":
        return formatNonWorkingWeekdays(
          this.eyePlugin.settings.availability.nonWorkingWeekdays,
        );
      default:
        throw new Error(`Tasks Eye does not define a "${key}" setting.`);
    }
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (typeof value !== "string") {
      throw new TypeError(`Tasks Eye setting "${key}" must be a string.`);
    }

    switch (key) {
      case "notesFolderPath":
        await this.eyePlugin.setNotesFolderPath(value);
        return;
      case "holidayCountry":
        await this.eyePlugin.setHolidayCountry(value);
        return;
      case "nonWorkingWeekdays": {
        const weekdays = parseNonWorkingWeekdays(value);
        if (weekdays === null) throw new Error(WEEKDAY_INPUT_ERROR);
        await this.eyePlugin.setNonWorkingWeekdays(weekdays);
        return;
      }
      default:
        throw new Error(`Tasks Eye does not define a "${key}" setting.`);
    }
  }

  private personalTimeOffLabel(entry: PersonalTimeOff): string {
    return entry.to ? `${entry.from} — ${entry.to}` : entry.from;
  }

  private renderPersonalEntry(setting: Setting, entry: PersonalTimeOff): void {
    setting.setClass("eye-personal-entry");
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

  private holidayCountryOptions(): Record<string, string> {
    const options: Record<string, string> = { "": "Not selected" };
    for (const country of this.eyePlugin.settings.holidayCache.countries) {
      options[country.countryCode] = country.name;
    }

    const selected = this.eyePlugin.settings.availability.countryCode;
    if (selected && !options[selected]) options[selected] = selected;
    return options;
  }
}
