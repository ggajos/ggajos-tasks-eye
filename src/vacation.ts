import {
  currentYear,
  formatMonthDay,
  formatWeekday,
  formatYear,
  formatYmd,
  isoToTs,
  shiftIsoDate,
} from "./date";

export interface DateRange {
  from: string;
  to: string;
}

export type CustomDate = string | DateRange;

export interface VacationConfig {
  weekendDays: readonly number[];
  bankHolidaysAnnual: readonly string[];
  customDates: readonly CustomDate[];
}

export type VacationReason = "weekend" | "holiday" | "custom";
export type MarkerReason = "custom" | "holiday";

export interface VacationMarker {
  ts: number;
  dateLabel: string;
  yearLabel: string;
  dayLabel: string;
  reason: MarkerReason;
  label: string;
}

interface DateParts {
  ymd: string;
  md: string;
  weekday: number;
  year: number;
}

function tsToParts(ts: number): DateParts {
  const d = new Date(ts);
  return {
    ymd: formatYmd(ts),
    md: formatMonthDay(ts),
    weekday: d.getDay(),
    year: d.getFullYear(),
  };
}

function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return formatYmd(new Date(year, month - 1, day).getTime());
}

function movableHolidays(year: number): readonly string[] {
  const easter = easterSunday(year);
  return [
    easter,
    shiftIsoDate(easter, 1),
    shiftIsoDate(easter, 49),
    shiftIsoDate(easter, 60),
  ];
}

function isRange(entry: CustomDate): entry is DateRange {
  return typeof entry === "object" && entry !== null;
}

export function inCustomDates(
  ymd: string,
  customDates: readonly CustomDate[],
): boolean {
  for (const entry of customDates) {
    if (isRange(entry)) {
      const lo = entry.from <= entry.to ? entry.from : entry.to;
      const hi = entry.from <= entry.to ? entry.to : entry.from;
      if (ymd >= lo && ymd <= hi) return true;
    } else if (entry === ymd) {
      return true;
    }
  }
  return false;
}

export function vacationReasonForTs(
  ts: number,
  config: VacationConfig,
): VacationReason | null {
  const parts = tsToParts(ts);
  if (config.weekendDays.includes(parts.weekday)) return "weekend";
  if (
    config.bankHolidaysAnnual.includes(parts.md) ||
    movableHolidays(parts.year).includes(parts.ymd)
  ) {
    return "holiday";
  }
  if (inCustomDates(parts.ymd, config.customDates)) return "custom";
  return null;
}

function markerReasonForIso(
  iso: string,
  config: VacationConfig,
): MarkerReason | null {
  if (inCustomDates(iso, config.customDates)) return "custom";
  if (vacationReasonForTs(isoToTs(iso), config) === "holiday") {
    return "holiday";
  }
  return null;
}

function makeMarker(iso: string, reason: MarkerReason): VacationMarker {
  const year = formatYear(iso);
  return {
    ts: isoToTs(iso),
    dateLabel: formatMonthDay(iso),
    yearLabel: year === currentYear() ? "" : year,
    dayLabel: formatWeekday(iso),
    reason,
    label: reason === "custom" ? "Vacation" : "Holiday",
  };
}

export function vacationMarkers(
  fromTs: number,
  toTs: number,
  config: VacationConfig,
): VacationMarker[] {
  const markers: VacationMarker[] = [];
  if (toTs < fromTs) return markers;

  const end = formatYmd(toTs);
  let iso = formatYmd(fromTs);
  while (iso <= end) {
    const reason = markerReasonForIso(iso, config);
    if (reason) markers.push(makeMarker(iso, reason));
    iso = shiftIsoDate(iso, 1);
  }
  return markers;
}
