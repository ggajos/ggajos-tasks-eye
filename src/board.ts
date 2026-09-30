import type { EyeMode } from "./constants";
import {
  discoverContexts,
  getGlobalContext,
  normalizeContextFilter,
  withVacationContext,
} from "./context";
import type { BoardBucket, RenderItem } from "./model";
import {
  boardItemsForContext,
  buildBoardBuckets,
  buildRowModels,
  selectRowModels,
} from "./model";
import type { EyeFile, RowModel } from "./types";
import type { AvailabilityConfig } from "./vacation";
import { EMPTY_AVAILABILITY_CONFIG } from "./vacation";

export type BoardMode = Exclude<EyeMode, "done">;

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
  | { kind: "buckets"; buckets: BoardBucket[] };

export interface BoardScreen extends BoardContexts {
  counts: BoardCounts;
  body: BoardBody;
  isEmpty: boolean;
}

export interface BoardRequest {
  mode: EyeMode;
  contextFilter: string;
  now: Date;
  availability?: AvailabilityConfig;
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

export function buildBoard(
  files: readonly EyeFile[],
  request: BoardRequest & { mode: BoardMode },
): BoardScreen {
  const availability = request.availability ?? EMPTY_AVAILABILITY_CONFIG;
  const { mode, now } = request;
  const context = boardContexts(files, mode, request.contextFilter);
  const { contextFilter, globalContext } = context;

  const models = buildRowModels(files, availability);
  const select = (selectMode: EyeMode, filter: string) =>
    selectRowModels(models, files, selectMode, filter);
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
