export const STATUSES = ["open", "hold", "closed", "archived"] as const;

export const MODES = ["open", "inbox", "hold", "done"] as const;

export const MODE_LABELS: Record<EyeMode, string> = {
  open: "Open",
  inbox: "Inbox",
  hold: "Hold",
  done: "Done",
};

export type EyeStatus = (typeof STATUSES)[number];
export type EyeMode = (typeof MODES)[number];

export function isEyeMode(value: unknown): value is EyeMode {
  return (
    typeof value === "string" && (MODES as readonly string[]).includes(value)
  );
}

export type DueBucket =
  | "noDue"
  | "today"
  | "tomorrow"
  | "thisMonth"
  | "nextMonth"
  | "future";

export const DUE_BUCKETS: ReadonlyArray<{ key: DueBucket; label: string }> = [
  { key: "noDue", label: "No Due Date" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "thisMonth", label: "This Month" },
  { key: "nextMonth", label: "Next Month" },
  { key: "future", label: "Future" },
] as const;

export const TASKS_PLUGIN_REQUIRED_MESSAGE =
  "Tasks Eye needs a compatible version of the Tasks community plugin. " +
  "Install, enable, or update Tasks, then reload Obsidian.";

export function fileNotFoundMessage(path: string): string {
  return `Tasks Eye can't find the file "${path}".`;
}

export function taskUpdateFailedMessage(path: string): string {
  return `Tasks Eye couldn't update the task in "${path}".`;
}

export const BOARD_RENDER_FAILED_MESSAGE =
  "Tasks Eye couldn't load your notes. Check the developer console for " +
  "details, then try reopening the view.";
