import type { PersonalTimeOff } from "./availability";
import {
  DEFAULT_AVAILABILITY_SETTINGS,
  EMPTY_HOLIDAY_CACHE,
} from "./availability";
import type { EyeMode } from "./constants";
import { DEFAULT_MODE, isEyeMode } from "./constants";
import {
  newPersonalTimeOff,
  normalizeAvailabilitySettings,
  normalizeHolidayCache,
} from "./holidaySync";
import {
  DEFAULT_MANAGED_FOLDER_PATH,
  excludedFolderError,
  excludedNotesFolderMessage,
  exclusionCoveringNotesFolder,
  missingManagedFolderMessage,
  normalizeExcludedFolderPath,
  normalizeExcludedFolderPaths,
  normalizeManagedFolderPath,
  notesFolderExclusionError,
} from "./managedPath";
import type { EyeSettings } from "./types";

export function defaultSettings(): EyeSettings {
  return {
    mode: DEFAULT_MODE,
    contextFilter: "*",
    notesFolderPath: DEFAULT_MANAGED_FOLDER_PATH,
    excludedFolderPaths: [],
    availability: {
      countryCode: DEFAULT_AVAILABILITY_SETTINGS.countryCode,
      nonWorkingWeekdays: [...DEFAULT_AVAILABILITY_SETTINGS.nonWorkingWeekdays],
      personalTimeOff: [],
    },
    holidayCache: {
      countryCode: EMPTY_HOLIDAY_CACHE.countryCode,
      years: {},
      countries: [],
      countriesFetchedAt: null,
    },
  };
}

export function normalizeSettings(value: unknown): EyeSettings {
  const defaults = defaultSettings();
  const saved =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return {
    mode: isEyeMode(saved.mode) ? saved.mode : defaults.mode,
    contextFilter:
      typeof saved.contextFilter === "string" && saved.contextFilter
        ? saved.contextFilter
        : defaults.contextFilter,
    notesFolderPath: normalizeManagedFolderPath(
      typeof saved.notesFolderPath === "string"
        ? saved.notesFolderPath
        : defaults.notesFolderPath,
    ),
    excludedFolderPaths: normalizeExcludedFolderPaths(
      saved.excludedFolderPaths,
    ),
    availability: normalizeAvailabilitySettings(saved.availability),
    holidayCache: normalizeHolidayCache(saved.holidayCache),
  };
}

export interface SettingsHost {
  /** The live settings object; the model mutates it in place. */
  settings(): EyeSettings;
  persist(): Promise<void>;
  /** Settings that affect indexed or rendered data changed. */
  changed(): Promise<void>;
  folderExists(path: string): boolean;
}

/**
 * Validated mutations of user settings. Enforces invariants such as
 * "changing which folders are indexed resets the context filter", and
 * decides which changes need a data refresh versus only a save.
 */
export class SettingsModel {
  private personalSequence = 0;

  constructor(
    private readonly host: SettingsHost,
    private readonly now: () => number = Date.now,
  ) {}

  private get s(): EyeSettings {
    return this.host.settings();
  }

  private async saveAndRefresh(): Promise<void> {
    await this.host.persist();
    await this.host.changed();
  }

  async setMode(mode: EyeMode): Promise<void> {
    if (this.s.mode === mode) return;
    this.s.mode = mode;
    await this.host.persist();
  }

  async setContextFilter(contextFilter: string): Promise<void> {
    const normalized = contextFilter || "*";
    if (this.s.contextFilter === normalized) return;
    this.s.contextFilter = normalized;
    await this.host.persist();
  }

  managedFolderError(): string | null {
    const missing = this.missingFolderError(this.s.notesFolderPath);
    if (missing) return missing;
    const covering = exclusionCoveringNotesFolder(
      this.s.notesFolderPath,
      this.s.excludedFolderPaths,
    );
    return covering
      ? excludedNotesFolderMessage(this.s.notesFolderPath, covering)
      : null;
  }

  notesFolderSettingError(notesFolderPath: string): string | null {
    return (
      notesFolderExclusionError(notesFolderPath, this.s.excludedFolderPaths) ??
      this.missingFolderError(notesFolderPath)
    );
  }

  async setNotesFolderPath(notesFolderPath: string): Promise<void> {
    const normalized = normalizeManagedFolderPath(notesFolderPath);
    if (this.s.notesFolderPath === normalized) return;
    const exclusionError = notesFolderExclusionError(
      normalized,
      this.s.excludedFolderPaths,
    );
    if (exclusionError) throw new Error(exclusionError);
    this.s.notesFolderPath = normalized;
    this.s.contextFilter = "*";
    await this.saveAndRefresh();
  }

  excludedFolderSettingError(index: number, value: string): string | null {
    return excludedFolderError(
      value,
      index,
      this.s.notesFolderPath,
      this.s.excludedFolderPaths,
    );
  }

  excludedFolderExists(excludedFolderPath: string): boolean {
    const normalized = normalizeExcludedFolderPath(excludedFolderPath);
    return normalized !== "" && this.host.folderExists(normalized);
  }

  async addExcludedFolder(): Promise<void> {
    this.s.excludedFolderPaths = [...this.s.excludedFolderPaths, ""];
    await this.host.persist();
  }

  async setExcludedFolder(index: number, value: string): Promise<void> {
    if (index < 0 || index >= this.s.excludedFolderPaths.length) {
      throw new Error(`No excluded folder exists at index ${index}.`);
    }
    const error = this.excludedFolderSettingError(index, value);
    if (error) throw new Error(error);
    const normalized = normalizeExcludedFolderPath(value);
    if (this.s.excludedFolderPaths[index] === normalized) return;
    this.s.excludedFolderPaths = this.s.excludedFolderPaths.map(
      (existing, existingIndex) =>
        existingIndex === index ? normalized : existing,
    );
    await this.excludedFoldersChanged();
  }

  async deleteExcludedFolder(index: number): Promise<void> {
    const removed = this.s.excludedFolderPaths[index];
    if (removed === undefined) {
      throw new Error(`No excluded folder exists at index ${index}.`);
    }
    this.s.excludedFolderPaths = this.s.excludedFolderPaths.filter(
      (_, existingIndex) => existingIndex !== index,
    );
    if (removed === "") {
      await this.host.persist();
      return;
    }
    await this.excludedFoldersChanged();
  }

  async setNonWorkingWeekdays(days: readonly number[]): Promise<void> {
    if (days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
      throw new Error("Non-working weekdays must be integers from 0 to 6.");
    }
    const normalized = [...new Set(days)].sort((a, b) => a - b);
    const current = this.s.availability.nonWorkingWeekdays;
    if (
      normalized.length === current.length &&
      normalized.every((day, index) => day === current[index])
    ) {
      return;
    }
    this.s.availability.nonWorkingWeekdays = normalized;
    await this.saveAndRefresh();
  }

  async addPersonalTimeOff(): Promise<void> {
    const id = `time-off-${this.now().toString(36)}-${++this.personalSequence}`;
    this.s.availability.personalTimeOff = [
      ...this.s.availability.personalTimeOff,
      newPersonalTimeOff(id),
    ];
    await this.saveAndRefresh();
  }

  async updatePersonalTimeOff(
    id: string,
    patch: Partial<Pick<PersonalTimeOff, "from" | "to" | "label">>,
  ): Promise<void> {
    const entry = this.s.availability.personalTimeOff.find(
      (candidate) => candidate.id === id,
    );
    if (!entry) return;
    Object.assign(entry, patch);
    entry.label = entry.label.trim();
    this.s.availability.personalTimeOff.sort(
      (a, b) => a.from.localeCompare(b.from) || a.id.localeCompare(b.id),
    );
    await this.saveAndRefresh();
  }

  async deletePersonalTimeOff(id: string): Promise<void> {
    const current = this.s.availability.personalTimeOff;
    const next = current.filter((entry) => entry.id !== id);
    if (next.length === current.length) return;
    this.s.availability.personalTimeOff = next;
    await this.saveAndRefresh();
  }

  private missingFolderError(notesFolderPath: string): string | null {
    const normalized = normalizeManagedFolderPath(notesFolderPath);
    return this.host.folderExists(normalized)
      ? null
      : missingManagedFolderMessage(normalized);
  }

  private async excludedFoldersChanged(): Promise<void> {
    this.s.contextFilter = "*";
    await this.saveAndRefresh();
  }
}
