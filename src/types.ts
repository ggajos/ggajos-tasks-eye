import type { EyeMode } from "./constants";
import type { AvailabilitySettings, HolidayCache } from "./vacation";
import type { ValidationViolation } from "./validation";

export interface EyeTask {
  completed: boolean;
  text: string;
  dueTs: number | null;
  dueIso: string | null;
  line: number;
  lineText: string;
}

export interface EyeFile {
  path: string;
  name: string;
  basename: string;
  managedFolderPath: string;
  status?: unknown;
  tasks: EyeTask[];
}

export interface RowModel {
  file: EyeFile;
  earliestDue: number | null;
  earliestTask: EyeTask | undefined;
  errors: ValidationViolation[];
  isToday: boolean;
  isFuture: boolean;
  dateLabel: string;
  yearLabel: string;
  dayLabel: string;
  actionLabel: string;
  contextKey: string;
  contextLabel: string;
}

export interface EyeSettings {
  mode: EyeMode;
  contextFilter: string;
  notesFolderPath: string;
  availability: AvailabilitySettings;
  holidayCache: HolidayCache;
}
