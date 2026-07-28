import type { DueBucket, EyeMode } from "./constants";
import { DUE_BUCKETS } from "./constants";
import {
  getContextFromPath,
  getTopLevelContext,
  matchesContextFilter,
  VACATION_CONTEXT,
} from "./context";
import {
  formatHumanDate,
  formatYmd,
  isAfterToday,
  isoToTs,
  todayIso,
} from "./date";
import { stripDueDate } from "./taskParsing";
import { findEarliestDueTask, getEarliestDueDate } from "./taskSelection";
import type { EyeFile, RowModel } from "./types";
import type { AvailabilityConfig, VacationMarker } from "./vacation";
import { EMPTY_AVAILABILITY_CONFIG, vacationMarkers } from "./vacation";
import type { ValidationViolation } from "./validation";
import { statusValue, validateFile } from "./validation";

export type RenderItem =
  | { kind: "task"; model: RowModel }
  | { kind: "marker"; marker: VacationMarker };

export interface BoardDayGroup {
  key: string;
  label: string;
  items: RenderItem[];
  taskCount: number;
}

export interface BoardBucket {
  key: DueBucket;
  label: string;
  days: BoardDayGroup[];
  taskCount: number;
}

interface MutableBoardBucket extends BoardBucket {
  dayMap: Map<string, BoardDayGroup>;
}

export { getEarliestDueDate } from "./taskSelection";

export function rowErrors(
  file: EyeFile,
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
): ValidationViolation[] {
  const earliestDue = getEarliestDueDate(file.tasks);
  return validateFile(file, availability).filter(
    (violation) =>
      violation.code !== "task-on-unavailable-day" ||
      violation.dueTs === earliestDue,
  );
}

export function buildRowModel(
  file: EyeFile,
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
): RowModel {
  const earliestDue = getEarliestDueDate(file.tasks);
  const earliestTask = findEarliestDueTask(file.tasks);
  return {
    file,
    earliestDue,
    earliestTask,
    errors: rowErrors(file, availability),
    isFuture: earliestDue !== null && isAfterToday(earliestDue),
    actionLabel: earliestTask
      ? stripDueDate(earliestTask.text)
      : "No unchecked tasks",
    contextKey: getTopLevelContext(file.path, file.managedFolderPath),
    contextLabel: getContextFromPath(file.path, file.managedFolderPath),
  };
}

function compareByContextTitle(a: EyeFile, b: EyeFile): number {
  const context = getContextFromPath(a.path, a.managedFolderPath).localeCompare(
    getContextFromPath(b.path, b.managedFolderPath),
  );
  if (context !== 0) return context;

  return a.basename.localeCompare(b.basename);
}

export function compareRowModels(a: RowModel, b: RowModel): number {
  if (a.earliestDue !== b.earliestDue) {
    if (a.earliestDue === null) return -1;
    if (b.earliestDue === null) return 1;
    return a.earliestDue - b.earliestDue;
  }
  return compareByContextTitle(a.file, b.file);
}

export function rowMatchesMode(model: RowModel, mode: EyeMode): boolean {
  const status = statusValue(model.file);
  if (mode === "focus") {
    return status === "open" && model.earliestDue !== null && !model.isFuture;
  }
  if (mode === "open") return status === "open";
  if (mode === "inbox") return model.errors.length > 0;
  if (mode === "hold") return status === "hold";
  return false;
}

export function selectRows(
  files: EyeFile[],
  mode: EyeMode,
  contextFilter: string,
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
): RowModel[] {
  return files
    .map((file) => buildRowModel(file, availability))
    .filter((model) => rowMatchesMode(model, mode))
    .filter((model) =>
      matchesContextFilter(
        model.file.path,
        contextFilter,
        model.file.managedFolderPath,
      ),
    )
    .sort(compareRowModels);
}

function vacationMarkersForRows(
  rows: RowModel[],
  availability: AvailabilityConfig,
): VacationMarker[] {
  let lastDue: number | null = null;
  for (const model of rows) {
    if (
      model.earliestDue !== null &&
      (lastDue === null || model.earliestDue > lastDue)
    ) {
      lastDue = model.earliestDue;
    }
  }
  if (lastDue === null) return [];
  return vacationMarkers(isoToTs(todayIso()), lastDue, availability);
}

export function mergeItems(
  rows: RowModel[],
  markers: VacationMarker[],
): RenderItem[] {
  const items: RenderItem[] = [];
  const dated: RowModel[] = [];

  for (const row of rows) {
    if (row.earliestDue === null) items.push({ kind: "task", model: row });
    else dated.push(row);
  }

  let i = 0;
  let j = 0;
  while (i < dated.length && j < markers.length) {
    const row = dated[i]!;
    const marker = markers[j]!;
    if ((row.earliestDue as number) <= marker.ts) {
      items.push({ kind: "task", model: row });
      i++;
    } else {
      items.push({ kind: "marker", marker });
      j++;
    }
  }
  while (i < dated.length) {
    items.push({ kind: "task", model: dated[i]! });
    i++;
  }
  while (j < markers.length) {
    items.push({ kind: "marker", marker: markers[j]! });
    j++;
  }

  return items;
}

export function boardItemsForContext(
  rows: RowModel[],
  vacationSourceRows: RowModel[],
  contextFilter: string,
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
): RenderItem[] {
  if (contextFilter === VACATION_CONTEXT) {
    return vacationMarkersForRows(vacationSourceRows, availability).map(
      (marker) => ({
        kind: "marker",
        marker,
      }),
    );
  }

  if (contextFilter && contextFilter !== "*") {
    return rows.map((model) => ({
      kind: "task",
      model,
    }));
  }

  return mergeItems(
    rows,
    vacationMarkersForRows(vacationSourceRows, availability),
  );
}

function startOfDay(ts: number): Date {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function bucketForTs(due: number | null, now: Date): DueBucket {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (due === null) return "noDue";

  const day = startOfDay(due);
  if (day.getTime() <= today.getTime()) return "today";

  const tomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );
  if (day.getTime() === tomorrow.getTime()) return "tomorrow";

  if (
    day.getFullYear() === today.getFullYear() &&
    day.getMonth() === today.getMonth()
  ) {
    return "thisMonth";
  }

  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  if (
    day.getFullYear() === nextMonth.getFullYear() &&
    day.getMonth() === nextMonth.getMonth()
  ) {
    return "nextMonth";
  }

  return "future";
}

function itemTs(item: RenderItem): number | null {
  return item.kind === "task" ? item.model.earliestDue : item.marker.ts;
}

function dayKey(ts: number | null): string {
  return ts === null ? "noDue" : formatYmd(ts);
}

function dayLabel(ts: number | null): string {
  return ts === null ? "No Due Date" : formatHumanDate(ts);
}

function emptyBoardBucket(key: DueBucket, label: string): MutableBoardBucket {
  return {
    key,
    label,
    days: [],
    taskCount: 0,
    dayMap: new Map<string, BoardDayGroup>(),
  };
}

export function buildBoardBuckets(
  items: RenderItem[],
  now: Date,
): BoardBucket[] {
  const buckets = new Map<DueBucket, MutableBoardBucket>();
  for (const bucket of DUE_BUCKETS) {
    buckets.set(bucket.key, emptyBoardBucket(bucket.key, bucket.label));
  }

  for (const item of items) {
    const ts = itemTs(item);
    const bucket = buckets.get(bucketForTs(ts, now));
    if (!bucket) continue;

    const key = dayKey(ts);
    let day = bucket.dayMap.get(key);
    if (!day) {
      day = {
        key,
        label: dayLabel(ts),
        items: [],
        taskCount: 0,
      };
      bucket.dayMap.set(key, day);
      bucket.days.push(day);
    }

    day.items.push(item);
    if (item.kind === "task") {
      day.taskCount++;
      bucket.taskCount++;
    }
  }

  return Array.from(buckets.values())
    .filter((bucket) => bucket.days.length > 0)
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      days: bucket.days,
      taskCount: bucket.taskCount,
    }));
}
