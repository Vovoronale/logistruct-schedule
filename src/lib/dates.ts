const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
export type HolidaySet = ReadonlySet<string>;
const NO_HOLIDAYS: HolidaySet = new Set<string>();

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return toIsoDate(date) === value ? date : null;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftCalendarDays(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * DAY_MS);
}

export function isWeekend(value: string): boolean {
  const date = parseIsoDate(value);
  if (!date) return false;
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function isNonWorkingDay(
  value: string,
  holidays: HolidaySet = NO_HOLIDAYS,
): boolean {
  return isWeekend(value) || holidays.has(value);
}

export function addWorkingDays(
  startDate: string | null,
  durationDays: number | null,
  holidays: HolidaySet = NO_HOLIDAYS,
): string | null {
  const start = parseIsoDate(startDate);
  if (!start || !durationDays || durationDays < 1 || !Number.isInteger(durationDays)) {
    return null;
  }

  let cursor = start;
  let remaining = durationDays;
  while (remaining > 0) {
    cursor = shiftCalendarDays(cursor, 1);
    if (!isNonWorkingDay(toIsoDate(cursor), holidays)) remaining -= 1;
  }
  return toIsoDate(cursor);
}

export function workingDaysAfter(
  startValue: string,
  endValue: string,
  holidays: HolidaySet = NO_HOLIDAYS,
): number | null {
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (!start || !end) return null;
  if (end <= start) return 0;

  let count = 0;
  for (
    let cursor = shiftCalendarDays(start, 1);
    cursor <= end;
    cursor = shiftCalendarDays(cursor, 1)
  ) {
    if (!isNonWorkingDay(toIsoDate(cursor), holidays)) count += 1;
  }
  return count;
}

interface TimelineSource {
  startDate: string | null;
  durationDays: number | null;
}

export function buildTimelineDays(
  items: TimelineSource[],
  today = todayIso(),
  holidays: HolidaySet = NO_HOLIDAYS,
): string[] {
  let earliest = parseIsoDate(today);
  let latest = parseIsoDate(today);

  for (const item of items) {
    const start = parseIsoDate(item.startDate);
    const endValue = addWorkingDays(item.startDate, item.durationDays, holidays);
    const end = parseIsoDate(endValue);
    if (!start || !end) continue;
    if (!earliest || start < earliest) earliest = start;
    if (!latest || end > latest) latest = end;
  }

  if (!earliest || !latest) return [];

  const first = shiftCalendarDays(earliest, -2);
  const last = shiftCalendarDays(latest, 2);
  const days: string[] = [];
  for (let cursor = first; cursor <= last; cursor = shiftCalendarDays(cursor, 1)) {
    days.push(toIsoDate(cursor));
  }
  return days;
}

export function formatDate(value: string | null): string {
  const date = parseIsoDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatMonth(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("uk-UA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function weekdayLabel(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("uk-UA", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");
}

export function dayNumber(value: string): string {
  return parseIsoDate(value)?.getUTCDate().toString() ?? "";
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
