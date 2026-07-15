import { DUE_BUCKETS, VACATION } from "./constants";
import type { DueBucket, EyeMode } from "./constants";
import {
  getContextFromPath,
  getTopLevelContext,
  matchesContextFilter,
  VACATION_CONTEXT,
} from "./context";
import {
  currentYear,
  formatHumanDate,
  formatMonthDay,
  formatWeekday,
  formatYear,
  formatYmd,
  isAfterToday,
  isToday,
  isoToTs,
  todayIso,
} from "./date";
import { stripDueDate } from "./taskParsing";
import type { EyeFile, EyeTask, RowModel } from "./types";
import { statusValue, validateFile } from "./validation";
import type { ValidationViolation } from "./validation";
import { vacationMarkers } from "./vacation";
import type { VacationMarker } from "./vacation";

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

function getUncompletedTasksWithDue(tasks: EyeTask[]): EyeTask[] {
  return tasks.filter((task) => !task.completed && task.dueTs !== null);
}

export function getEarliestDueDate(tasks: EyeTask[]): number | null {
  const dated = getUncompletedTasksWithDue(tasks);
  if (dated.length === 0) return null;
  return Math.min(...dated.map((task) => task.dueTs as number));
}

function findEarliestDueTask(tasks: EyeTask[]): EyeTask | undefined {
  const uncompleted = tasks.filter((task) => !task.completed);
  if (uncompleted.length === 0) return undefined;

  const dated = uncompleted.filter((task) => task.dueTs !== null);
  if (dated.length === 0) return uncompleted[0];

  return [...dated].sort((a, b) =>
    (a.dueTs as number) - (b.dueTs as number)
  )[0];
}

export function rowErrors(file: EyeFile): ValidationViolation[] {
  const earliestDue = getEarliestDueDate(file.tasks);
  return validateFile(file).filter((violation) =>
    violation.code !== "task-on-vacation" || violation.dueTs === earliestDue
  );
}

export function buildRowModel(file: EyeFile): RowModel {
  const earliestDue = getEarliestDueDate(file.tasks);
  const year = earliestDue === null ? "" : formatYear(earliestDue);
  const earliestTask = findEarliestDueTask(file.tasks);
  return {
    file,
    earliestDue,
    earliestTask,
    errors: rowErrors(file),
    isToday: earliestDue !== null && isToday(earliestDue),
    isFuture: earliestDue !== null && isAfterToday(earliestDue),
    dateLabel: earliestDue === null ? "no due" : formatMonthDay(earliestDue),
    yearLabel: year === currentYear() ? "" : year,
    dayLabel: earliestDue === null ? "" : formatWeekday(earliestDue),
    actionLabel: earliestTask ? stripDueDate(earliestTask.text) : "No uncompleted tasks",
    contextKey: getTopLevelContext(file.path, file.managedFolderPath),
    contextLabel: getContextFromPath(file.path, file.managedFolderPath),
  };
}

export function rowStateClasses(model: RowModel): string[] {
  const classes: string[] = [];
  if (model.errors.length > 0) classes.push("is-violation");
  if (model.isToday) classes.push("is-today");
  if (model.isFuture) classes.push("is-future");
  return classes;
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
  if (mode === "open") return status === "open";
  if (mode === "inbox") return model.errors.length > 0;
  if (mode === "hold") return status === "hold";
  return false;
}

export function selectRows(
  files: EyeFile[],
  mode: EyeMode,
  contextFilter: string,
): RowModel[] {
  return files
    .map(buildRowModel)
    .filter((model) => rowMatchesMode(model, mode))
    .filter((model) =>
      matchesContextFilter(
        model.file.path,
        contextFilter,
        model.file.managedFolderPath,
      )
    )
    .sort(compareRowModels);
}

function vacationMarkersForRows(rows: RowModel[]): VacationMarker[] {
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
  return vacationMarkers(isoToTs(todayIso()), lastDue, VACATION);
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
): RenderItem[] {
  if (contextFilter === VACATION_CONTEXT) {
    return vacationMarkersForRows(vacationSourceRows).map((marker) => ({
      kind: "marker",
      marker,
    }));
  }

  if (contextFilter && contextFilter !== "*") {
    return rows.map((model) => ({
      kind: "task",
      model,
    }));
  }

  return mergeItems(rows, vacationMarkersForRows(vacationSourceRows));
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
  return ts === null ? "No due" : formatHumanDate(ts);
}

function emptyBoardBucket(
  key: DueBucket,
  label: string,
): MutableBoardBucket {
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
