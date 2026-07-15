export const STATUSES = [
  "hold",
  "open",
  "closed",
  "archived",
] as const;

export const MODES = [
  "open",
  "inbox",
  "hold",
  "done",
] as const;

export const MODE_LABELS: Record<EyeMode, string> = {
  open: "Open",
  inbox: "Inbox",
  hold: "Hold",
  done: "Done",
};

export type EyeStatus = (typeof STATUSES)[number];
export type EyeMode = (typeof MODES)[number];

export function isEyeMode(value: unknown): value is EyeMode {
  return typeof value === "string" &&
    (MODES as readonly string[]).includes(value);
}

export type DueBucket =
  | "noDue"
  | "today"
  | "tomorrow"
  | "thisMonth"
  | "nextMonth"
  | "future";

export const DUE_BUCKETS: ReadonlyArray<{ key: DueBucket; label: string }> = [
  { key: "noDue", label: "No due" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "thisMonth", label: "This Month" },
  { key: "nextMonth", label: "Next Month" },
  { key: "future", label: "Future" },
] as const;

export const VACATION = {
  weekendDays: [0, 6],
  bankHolidaysAnnual: [
    "01-01",
    "01-06",
    "05-01",
    "05-03",
    "08-15",
    "11-01",
    "11-11",
    "12-25",
    "12-26",
  ],
  customDates: [
    "2026-07-13",
    { from: "2026-07-18", to: "2026-07-27" },
  ],
} as const;
