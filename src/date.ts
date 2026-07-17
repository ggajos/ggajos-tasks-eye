function toLocalDate(value: number | string): Date {
  if (typeof value === "number") return new Date(value);
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return new Date(year, month - 1, day);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number): string => String(n).padStart(2, "0");

function configuredToday(): string | null {
  const globalValue = (globalThis as { TASKS_EYE_TODAY?: unknown })
    .TASKS_EYE_TODAY;
  if (typeof globalValue === "string" && ISO_DATE_RE.test(globalValue)) {
    return globalValue;
  }

  if (typeof process !== "undefined") {
    const envValue = process.env.TASKS_EYE_TODAY;
    if (typeof envValue === "string" && ISO_DATE_RE.test(envValue)) {
      return envValue;
    }
  }

  return null;
}

export function nowDate(): Date {
  const today = configuredToday();
  return today ? toLocalDate(today) : new Date();
}

export function nowTs(): number {
  return nowDate().getTime();
}

export function formatYmd(value: number | string): string {
  const dt = toLocalDate(value);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function formatMonthDay(value: number | string): string {
  const dt = toLocalDate(value);
  return `${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function formatYear(value: number | string): string {
  return String(toLocalDate(value).getFullYear());
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const FULL_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function formatWeekday(value: number | string): string {
  return WEEKDAYS[toLocalDate(value).getDay()] ?? "";
}

export function formatHumanDate(value: number | string): string {
  const dt = toLocalDate(value);
  const month = FULL_MONTHS[dt.getMonth()] ?? "";
  const weekday = FULL_WEEKDAYS[dt.getDay()] ?? "";
  const label = `${month} ${pad(dt.getDate())} - ${weekday}`;
  return dt.getFullYear() === nowDate().getFullYear()
    ? label
    : `${dt.getFullYear()} ${label}`;
}

export function isToday(value: number | string): boolean {
  const dt = toLocalDate(value);
  const now = nowDate();
  return (
    dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate()
  );
}

export function isAfterToday(value: number | string): boolean {
  const dt = toLocalDate(value);
  const now = nowDate();
  const day = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return day.getTime() > today.getTime();
}

export function currentYear(): string {
  return String(nowDate().getFullYear());
}

export function shiftIsoDate(iso: string, deltaDays: number): string {
  const dt = toLocalDate(iso);
  dt.setDate(dt.getDate() + deltaDays);
  return formatYmd(dt.getTime());
}

export function isoToTs(iso: string): number {
  return toLocalDate(iso).getTime();
}

export function todayIso(): string {
  return formatYmd(nowTs());
}
