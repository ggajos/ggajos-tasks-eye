export type DueBucket =
  | "today"
  | "tomorrow"
  | "thisWeek"
  | "nextWeek"
  | "thisMonth"
  | "nextMonth"
  | "future";

export type DueSpec = DueBucket | "overdue" | "saturday" | "none";

const FORWARD_BUCKETS: readonly DueBucket[] = [
  "today",
  "tomorrow",
  "thisWeek",
  "nextWeek",
  "thisMonth",
  "nextMonth",
  "future",
];

const SEARCH_HORIZON_DAYS = 400;
const OVERDUE_HORIZON_DAYS = 45;

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function addDays(value: Date, days: number): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate() + days,
  );
}

export function formatYmd(value: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate(),
  )}`;
}

export function isWeekend(value: Date): boolean {
  const day = value.getDay();
  return day === 0 || day === 6;
}

// Mirrors bucketForTs() in src/model.ts. Kept local so the generator stays
// decoupled from plugin internals.
export function bucketFor(value: Date, today: Date): DueBucket | "overdue" {
  const start = startOfDay(today);
  const day = startOfDay(value);

  if (day.getTime() < start.getTime()) return "overdue";
  if (day.getTime() === start.getTime()) return "today";

  const tomorrow = addDays(start, 1);
  if (day.getTime() === tomorrow.getTime()) return "tomorrow";

  const mondayOffset = (start.getDay() + 6) % 7;
  const thisWeekEnd = addDays(start, 6 - mondayOffset);
  if (day.getTime() <= thisWeekEnd.getTime()) return "thisWeek";

  const nextWeekEnd = addDays(thisWeekEnd, 7);
  if (day.getTime() <= nextWeekEnd.getTime()) return "nextWeek";

  if (
    day.getFullYear() === start.getFullYear() &&
    day.getMonth() === start.getMonth()
  ) {
    return "thisMonth";
  }

  const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  if (
    day.getFullYear() === nextMonth.getFullYear() &&
    day.getMonth() === nextMonth.getMonth()
  ) {
    return "nextMonth";
  }

  return "future";
}

function collectCandidates(
  bucket: DueBucket,
  today: Date,
  weekdaysOnly: boolean,
): Date[] {
  const candidates: Date[] = [];
  for (let offset = 0; offset <= SEARCH_HORIZON_DAYS; offset += 1) {
    const candidate = addDays(today, offset);
    if (bucketFor(candidate, today) !== bucket) continue;
    if (weekdaysOnly && isWeekend(candidate)) continue;
    candidates.push(candidate);
  }
  return candidates;
}

function collectOverdueCandidates(today: Date, weekdaysOnly: boolean): Date[] {
  const candidates: Date[] = [];
  for (let offset = 1; offset <= OVERDUE_HORIZON_DAYS; offset += 1) {
    const candidate = addDays(today, -offset);
    if (weekdaysOnly && isWeekend(candidate)) continue;
    candidates.push(candidate);
  }
  return candidates;
}

function pick(candidates: readonly Date[], occurrence: number): Date | null {
  if (candidates.length === 0) return null;
  return candidates[Math.min(occurrence, candidates.length - 1)] ?? null;
}

export function nextSaturday(today: Date): Date {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDays(today, offset);
    if (candidate.getDay() === 6) return candidate;
  }
  return addDays(today, 7);
}

/**
 * Resolves a due date for a target bucket, preferring working days so healthy
 * demo notes never trip the unavailable-day rule. Falls back to weekend days,
 * then to later buckets, so a note always receives a date regardless of which
 * weekday the generator runs on.
 */
export function resolveDueDate(
  spec: DueBucket | "overdue",
  today: Date,
  occurrence: number,
): Date {
  if (spec === "overdue") {
    return (
      pick(collectOverdueCandidates(today, true), occurrence) ??
      pick(collectOverdueCandidates(today, false), occurrence) ??
      addDays(today, -1)
    );
  }

  const startIndex = FORWARD_BUCKETS.indexOf(spec);

  // Prefer a working day, even if that means sliding into a later bucket.
  // Landing a healthy note on a weekend would raise a false
  // unavailable-day violation, which misrepresents the plugin.
  for (let index = startIndex; index < FORWARD_BUCKETS.length; index += 1) {
    const bucket = FORWARD_BUCKETS[index];
    if (!bucket) continue;
    const weekday = pick(collectCandidates(bucket, today, true), occurrence);
    if (weekday) return weekday;
  }

  for (let index = startIndex; index < FORWARD_BUCKETS.length; index += 1) {
    const bucket = FORWARD_BUCKETS[index];
    if (!bucket) continue;
    const anyDay = pick(collectCandidates(bucket, today, false), occurrence);
    if (anyDay) return anyDay;
  }

  return addDays(today, 1);
}

/** Most recent working day at least `minDaysAgo` in the past. */
export function recentWorkingDay(today: Date, minDaysAgo: number): Date {
  for (
    let offset = minDaysAgo;
    offset <= minDaysAgo + OVERDUE_HORIZON_DAYS;
    offset += 1
  ) {
    const candidate = addDays(today, -offset);
    if (!isWeekend(candidate)) return candidate;
  }
  return addDays(today, -minDaysAgo);
}
