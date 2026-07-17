import type {
  SettingDefinition,
  SettingDefinitionItem,
  SettingDefinitionPage,
} from "obsidian";
import { PluginSettingTab } from "obsidian";
import { isIsoDate } from "./date";
import type TheEyePlugin from "./main";
import { findManagedFolder } from "./managedFolder";
import {
  missingManagedFolderMessage,
  normalizeManagedFolderPath,
} from "./managedPath";
import type { PersonalTimeOff } from "./vacation";

const WEEKDAYS = [
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
  { day: 0, label: "Sunday" },
] as const;

const COUNTRY_KEY = "availability.countryCode";
const WEEKDAY_PREFIX = "availability.weekday.";
const PERSONAL_PREFIX = "availability.personal.";

export class TasksEyeSettingTab extends PluginSettingTab {
  private readonly eyePlugin: TheEyePlugin;

  constructor(app: TheEyePlugin["app"], plugin: TheEyePlugin) {
    super(app, plugin);
    this.eyePlugin = plugin;
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: "Notes folder",
        desc: "Tasks Eye reads Markdown notes in this folder and all subfolders.",
        control: {
          type: "folder",
          key: "notesFolderPath",
          includeRoot: true,
          validate: (value) => {
            const path = normalizeManagedFolderPath(value);
            return findManagedFolder(this.app, path)
              ? undefined
              : missingManagedFolderMessage(path);
          },
        },
      },
      {
        type: "page",
        name: "Availability",
        desc: this.availabilitySummary(),
        items: [
          {
            type: "group",
            heading: "Public holidays",
            items: [
              {
                name: "Country",
                desc: "Nationwide public holidays are downloaded from Nager.Date and cached locally.",
                control: {
                  type: "dropdown",
                  key: COUNTRY_KEY,
                  options: this.countryOptions(),
                },
              },
              {
                name: "Refresh public holidays",
                desc: this.eyePlugin.holidaySyncStatus(),
                action: () => {
                  void this.eyePlugin.refreshHolidayData(true);
                },
                disabled: () =>
                  !this.eyePlugin.settings.availability.countryCode ||
                  this.eyePlugin.holidaySyncing,
              },
            ],
          },
          {
            type: "group",
            heading: "Non-working days",
            items: WEEKDAYS.map(({ day, label }) => ({
              name: label,
              control: {
                type: "toggle" as const,
                key: `${WEEKDAY_PREFIX}${day}`,
              },
            })),
          },
          this.personalTimeOffList(),
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    if (key === "notesFolderPath") {
      return this.eyePlugin.settings.notesFolderPath;
    }
    if (key === COUNTRY_KEY) {
      return this.eyePlugin.settings.availability.countryCode;
    }
    if (key.startsWith(WEEKDAY_PREFIX)) {
      const day = Number(key.slice(WEEKDAY_PREFIX.length));
      return this.eyePlugin.settings.availability.nonWorkingWeekdays.includes(
        day,
      );
    }
    const personal = this.personalKey(key);
    if (personal?.field === "label") {
      return this.personalEntry(personal.id)?.label ?? "";
    }
    return super.getControlValue(key);
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key === "notesFolderPath" && typeof value === "string") {
      await this.eyePlugin.setNotesFolderPath(value);
      return;
    }
    if (key === COUNTRY_KEY && typeof value === "string") {
      await this.eyePlugin.setHolidayCountry(value);
      return;
    }
    if (key.startsWith(WEEKDAY_PREFIX) && typeof value === "boolean") {
      await this.eyePlugin.setNonWorkingWeekday(
        Number(key.slice(WEEKDAY_PREFIX.length)),
        value,
      );
      return;
    }
    const personal = this.personalKey(key);
    if (
      personal?.field === "label" &&
      typeof value === "string" &&
      this.personalEntry(personal.id)
    ) {
      await this.eyePlugin.updatePersonalTimeOff(personal.id, {
        label: value,
      });
      return;
    }
    await super.setControlValue(key, value);
  }

  private availabilitySummary(): string {
    const { availability, holidayCache } = this.eyePlugin.settings;
    const selected = holidayCache.countries.find(
      (country) => country.countryCode === availability.countryCode,
    );
    const country = selected?.name ?? availability.countryCode;
    const publicLabel = country || "No public-holiday country";
    const personalCount = availability.personalTimeOff.length;
    return `${publicLabel}; ${personalCount} personal ${
      personalCount === 1 ? "entry" : "entries"
    }.`;
  }

  private countryOptions(): Record<string, string> {
    const options: Record<string, string> = { "": "Not selected" };
    for (const country of this.eyePlugin.settings.holidayCache.countries) {
      options[country.countryCode] = country.name;
    }
    const selected = this.eyePlugin.settings.availability.countryCode;
    if (selected && !options[selected]) options[selected] = selected;
    return options;
  }

  private personalTimeOffList(): SettingDefinitionItem {
    const entries = this.eyePlugin.settings.availability.personalTimeOff;
    return {
      type: "list",
      heading: "Personal time off",
      emptyState: "No personal dates or ranges.",
      items: entries.map((entry) => this.personalTimeOffPage(entry)),
      onDelete: (index) => {
        const entry = entries[index];
        if (!entry) return;
        void this.eyePlugin
          .deletePersonalTimeOff(entry.id)
          .then(() => this.update());
      },
      addItem: {
        name: "Add personal time off",
        action: () => {
          void this.eyePlugin.addPersonalTimeOff().then(() => this.update());
        },
      },
    };
  }

  private personalTimeOffPage(entry: PersonalTimeOff): SettingDefinitionPage {
    return {
      type: "page",
      name: entry.to ? `${entry.from} — ${entry.to}` : entry.from,
      desc: entry.label || "Vacation",
      items: [
        this.dateDefinition(entry, "from"),
        this.dateDefinition(entry, "to"),
        {
          name: "Label",
          desc: "Optional. Unlabeled entries appear as Vacation.",
          control: {
            type: "text",
            key: `${PERSONAL_PREFIX}${entry.id}.label`,
            placeholder: "Vacation",
          },
        },
      ],
    };
  }

  private dateDefinition(
    entry: PersonalTimeOff,
    field: "from" | "to",
  ): SettingDefinition {
    const isEnd = field === "to";
    return {
      name: isEnd ? "End date" : "Start date",
      desc: isEnd ? "Optional; ranges include both dates." : undefined,
      render: (setting) => {
        setting.addText((component) => {
          component.inputEl.type = "date";
          component.setValue(entry[field] ?? "").onChange(async (value) => {
            if ((!isEnd || value) && !isIsoDate(value)) {
              setting.setErrorMessage(
                isEnd ? "Choose a valid end date." : "Choose a start date.",
              );
              return;
            }
            const from = isEnd ? entry.from : value;
            const to = isEnd ? value || null : entry.to;
            if (to && to < from) {
              setting.setErrorMessage("End date cannot be before start date.");
              return;
            }
            setting.setErrorMessage(null);
            await this.eyePlugin.updatePersonalTimeOff(entry.id, {
              [field]: isEnd ? value || null : value,
            });
          });
        });
      },
    };
  }

  private personalKey(key: string): { id: string; field: "label" } | null {
    if (!key.startsWith(PERSONAL_PREFIX) || !key.endsWith(".label")) {
      return null;
    }
    return {
      id: key.slice(PERSONAL_PREFIX.length, -".label".length),
      field: "label",
    };
  }

  private personalEntry(id: string): PersonalTimeOff | undefined {
    return this.eyePlugin.settings.availability.personalTimeOff.find(
      (entry) => entry.id === id,
    );
  }
}
