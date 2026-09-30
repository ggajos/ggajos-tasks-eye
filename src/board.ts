import type { AvailabilityConfig, VacationMarker } from "./availability";
import { EMPTY_AVAILABILITY_CONFIG, markersForDueRange } from "./availability";
import type { DoneContextGroup } from "./completedTasks";
import { prepareDone } from "./completedTasks";
import type { DueBucket, EyeMode } from "./constants";
import { DUE_BUCKETS } from "./constants";
import {
  discoverContexts,
  getGlobalContext,
  normalizeContextFilter,
  VACATION_CONTEXT,
  withVacationContext,
} from "./context";
import { formatHumanDate, formatYmd, nowDate } from "./date";
import { rowSelection } from "./model";
import type { VaultSnapshot } from "./snapshot";
import type { EyeFile, RowModel } from "./types";

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

export type BoardMode = EyeMode;

export interface BoardContexts {
  contexts: string[];
  globalContext: string;
  contextFilter: string;
}

export interface BoardCounts {
  focus: number;
  inbox: number;
}

export type BoardBody =
  | { kind: "focus"; items: RenderItem[] }
  | { kind: "buckets"; buckets: BoardBucket[] }
  | { kind: "done"; contexts: DoneContextGroup[] };

export interface BoardScreen extends BoardContexts {
  counts: BoardCounts;
  body: BoardBody;
  isEmpty: boolean;
}

export interface BoardRequest {
  mode: BoardMode;
  contextFilter: string;
  now: Date;
  /** Done mode: the reviewed completion date (ISO). */
  date?: string;
  /** Done mode: whether unfinished due-dated tasks are included. */
  showFuture?: boolean;
}

export function boardContexts(
  files: readonly EyeFile[],
  mode: EyeMode,
  savedContextFilter: string,
): BoardContexts {
  const globalContext = getGlobalContext(files);
  const discovered = discoverContexts(files);
  const contexts =
    mode === "focus" || mode === "open"
      ? withVacationContext(discovered)
      : discovered;
  return {
    contexts,
    globalContext,
    contextFilter: normalizeContextFilter(
      savedContextFilter,
      contexts,
      globalContext,
    ),
  };
}

function taskItems(rows: readonly RowModel[]): RenderItem[] {
  return rows.map((model) => ({ kind: "task", model }));
}

function lastDueOf(rows: readonly RowModel[]): number | null {
  let lastDue: number | null = null;
  for (const model of rows) {
    if (
      model.earliestDue !== null &&
      (lastDue === null || model.earliestDue > lastDue)
    ) {
      lastDue = model.earliestDue;
    }
  }
  return lastDue;
}

function boardMarkers(
  rows: readonly RowModel[],
  availability: AvailabilityConfig,
  now: Date,
): VacationMarker[] {
  return markersForDueRange(now, lastDueOf(rows), availability);
}

export function mergeItems(
  rows: readonly RowModel[],
  markers: readonly VacationMarker[],
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
  rows: readonly RowModel[],
  vacationSourceRows: readonly RowModel[],
  contextFilter: string,
  availability: AvailabilityConfig = EMPTY_AVAILABILITY_CONFIG,
  globalContext = "*",
  now: Date = nowDate(),
): RenderItem[] {
  if (contextFilter === VACATION_CONTEXT) {
    return boardMarkers(vacationSourceRows, availability, now).map(
      (marker) => ({
        kind: "marker",
        marker,
      }),
    );
  }

  if (
    contextFilter &&
    contextFilter !== "*" &&
    contextFilter !== globalContext
  ) {
    return rows.map((model) => ({
      kind: "task",
      model,
    }));
  }

  return mergeItems(rows, boardMarkers(vacationSourceRows, availability, now));
}

function startOfDay(ts: number): Date {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function bucketForTs(due: number | null, now: Date): DueBucket {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (due === null) return "noDue";

  const day = startOfDay(due);
  if (day.getTime() < today.getTime()) return "overdue";
  if (day.getTime() === today.getTime()) return "today";

  const tomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );
  if (day.getTime() === tomorrow.getTime()) return "tomorrow";

  const mondayOffset = (today.getDay() + 6) % 7;
  const thisWeekEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - mondayOffset + 6,
  );
  if (day.getTime() <= thisWeekEnd.getTime()) return "thisWeek";

  const nextWeekStart = new Date(
    thisWeekEnd.getFullYear(),
    thisWeekEnd.getMonth(),
    thisWeekEnd.getDate() + 1,
  );
  const nextWeekEnd = new Date(
    nextWeekStart.getFullYear(),
    nextWeekStart.getMonth(),
    nextWeekStart.getDate() + 6,
  );
  if (day.getTime() <= nextWeekEnd.getTime()) return "nextWeek";

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

function dayLabel(ts: number | null, now: Date): string {
  return ts === null ? "No Due Date" : formatHumanDate(ts, now);
}

interface MutableBoardBucket extends BoardBucket {
  dayMap: Map<string, BoardDayGroup>;
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
  items: readonly RenderItem[],
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
        label: dayLabel(ts, now),
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

export function buildBoard(
  snapshot: VaultSnapshot,
  request: BoardRequest,
): BoardScreen {
  const { files, availability } = snapshot;
  const { mode, now } = request;
  const context = boardContexts(files, mode, request.contextFilter);
  const { contextFilter, globalContext } = context;

  if (mode === "done") {
    const prepared = prepareDone(
      files,
      request.date ?? formatYmd(now.getTime()),
      request.showFuture ?? true,
      contextFilter,
    );
    return {
      ...context,
      counts: { focus: 0, inbox: 0 },
      body: { kind: "done", contexts: prepared.contexts },
      isEmpty: prepared.isEmpty,
    };
  }

  const selection = rowSelection(files, availability, now);
  const select = (selectMode: EyeMode, filter: string) =>
    selection.select(selectMode, filter);
  const rows = select(mode, contextFilter);
  const counts: BoardCounts = {
    focus: select("focus", contextFilter).length,
    inbox: select("inbox", contextFilter).length,
  };

  if (mode === "focus") {
    const items = boardItemsForContext(
      rows,
      select("open", "*"),
      contextFilter,
      availability,
      globalContext,
      now,
    );
    const focusItems = buildBoardBuckets(items, now)
      .filter((bucket) => bucket.key === "overdue" || bucket.key === "today")
      .flatMap((bucket) => bucket.days)
      .flatMap((day) => day.items);
    return {
      ...context,
      counts,
      body: { kind: "focus", items: focusItems },
      isEmpty: focusItems.length === 0,
    };
  }

  const items =
    mode === "open"
      ? boardItemsForContext(
          rows,
          select("open", "*"),
          contextFilter,
          availability,
          globalContext,
          now,
        )
      : taskItems(rows);
  const buckets = buildBoardBuckets(items, now);
  return {
    ...context,
    counts,
    body: { kind: "buckets", buckets },
    isEmpty: buckets.length === 0,
  };
}
