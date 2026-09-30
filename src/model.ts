import type { EyeMode } from "./constants";
import { getContextForFile, matchesContextFilter } from "./context";
import { isAfterToday, nowDate } from "./date";
import { NORMAL_PRIORITY } from "./priority";
import { findEarliestDueTask, getEarliestDueDate } from "./taskSelection";
import type { EyeFile, RowModel } from "./types";
import type { AvailabilityConfig } from "./vacation";
import { EMPTY_AVAILABILITY_CONFIG } from "./vacation";
import type { ValidationViolation } from "./validation";
import { statusValue, validateFile } from "./validation";

function rowErrors(
  file: EyeFile,
  availability: AvailabilityConfig,
  indexedFiles: readonly EyeFile[],
  now: Date,
): ValidationViolation[] {
  const earliestDue = getEarliestDueDate(file.tasks);
  return validateFile(file, availability, indexedFiles, now).filter(
    (violation) =>
      violation.code !== "task-on-unavailable-day" ||
      violation.dueTs === earliestDue,
  );
}

function buildRowModel(
  file: EyeFile,
  availability: AvailabilityConfig,
  indexedFiles: readonly EyeFile[],
  now: Date,
): RowModel {
  const earliestDue = getEarliestDueDate(file.tasks);
  const earliestTask = findEarliestDueTask(file.tasks);
  const context = getContextForFile(file, indexedFiles);
  return {
    file,
    earliestDue,
    earliestTask,
    errors: rowErrors(file, availability, indexedFiles, now),
    isFuture: earliestDue !== null && isAfterToday(earliestDue, now),
    actionLabel: earliestTask ? earliestTask.text : "No unchecked tasks",
    contextKey: context,
    contextLabel: context,
  };
}

function compareByContextTitle(a: RowModel, b: RowModel): number {
  const context = a.contextLabel.localeCompare(b.contextLabel);
  if (context !== 0) return context;

  return a.file.basename.localeCompare(b.file.basename);
}

function compareRowModels(a: RowModel, b: RowModel): number {
  if (a.earliestDue !== b.earliestDue) {
    if (a.earliestDue === null) return -1;
    if (b.earliestDue === null) return 1;
    return a.earliestDue - b.earliestDue;
  }

  const priorityA = a.earliestTask?.priority ?? NORMAL_PRIORITY;
  const priorityB = b.earliestTask?.priority ?? NORMAL_PRIORITY;
  if (priorityA !== priorityB) return priorityA - priorityB;

  return compareByContextTitle(a, b);
}

function rowMatchesMode(model: RowModel, mode: EyeMode): boolean {
  const status = statusValue(model.file);
  if (mode === "focus") {
    return status === "open" && model.earliestDue !== null && !model.isFuture;
  }
  if (mode === "open") return status === "open";
  if (mode === "inbox") return model.errors.length > 0;
  return false;
}

function buildRowModels(
  files: readonly EyeFile[],
  availability: AvailabilityConfig,
  now: Date,
): RowModel[] {
  return files.map((file) => buildRowModel(file, availability, files, now));
}

function selectRowModels(
  models: readonly RowModel[],
  files: readonly EyeFile[],
  mode: EyeMode,
  contextFilter: string,
): RowModel[] {
  return models
    .filter((model) => rowMatchesMode(model, mode))
    .filter((model) => matchesContextFilter(model.file, contextFilter, files))
    .sort(compareRowModels);
}

/**
 * One selection interface for the Row module: builds every row once, then
 * answers mode and context-filtered selections. Row errors, Inbox
 * membership and ordering are implementation details.
 */
export interface RowSelection {
  select(mode: EyeMode, contextFilter: string): RowModel[];
}

export function rowSelection(
  files: readonly EyeFile[],
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
  now: Date = nowDate(),
): RowSelection {
  const models = buildRowModels(files, availability, now);
  return {
    select: (mode, contextFilter) =>
      selectRowModels(models, files, mode, contextFilter),
  };
}

export function selectRows(
  files: readonly EyeFile[],
  mode: EyeMode,
  contextFilter: string,
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
  now: Date = nowDate(),
): RowModel[] {
  return rowSelection(files, availability, now).select(mode, contextFilter);
}
