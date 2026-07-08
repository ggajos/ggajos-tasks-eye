import type { EyeMode } from "./constants";

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
  status?: unknown;
  tasks: EyeTask[];
}

export interface RowModel {
  file: EyeFile;
  earliestDue: number | null;
  earliestTask: EyeTask | undefined;
  errors: string[];
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
}
