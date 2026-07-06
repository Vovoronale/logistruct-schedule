import type { ScheduleItem, ScheduleStatus } from "../types";
import { addWorkingDays, effectiveStartDate, todayIso, type HolidaySet } from "./dates";
import { calculateItemProgress } from "./progress";

export interface ScheduleFilters {
  query: string;
  section: string[];
  assignee: string[];
  status: ScheduleStatus[];
}

interface ScheduleFilterContext {
  today?: string;
  holidays?: HolidaySet;
}

export const STATUS_LABELS: Readonly<Record<ScheduleStatus, string>> = {
  planned: "Заплановано",
  in_progress: "У роботі",
  completed: "Завершено",
};

const START_MODE_LABELS = {
  manual: "Датою",
  dependencies: "За залежностями",
} as const;

const progressFormatter = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const normalizeSearchValue = (value: string) =>
  value.toLocaleLowerCase("uk-UA");

const formatProgress = (value: number) =>
  `${progressFormatter.format(value)}%`;

function filled(value: string | number | null | undefined): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  return typeof value === "string" && value.trim().length > 0;
}

export function getScheduleRowCompleteness(
  item: ScheduleItem,
): "complete" | "partial" | "empty" {
  const startValue = item.startDate
    ?? (item.startMode === "dependencies" && item.predecessorIds.length > 0
      ? item.predecessorIds.join(",")
      : null);
  const filledValues = [
    item.section,
    item.sheetNumber,
    item.title,
    startValue,
    item.durationDays,
    item.assignee,
  ].filter(filled).length;

  if (filledValues === 0) return "empty";
  return filledValues === 6 ? "complete" : "partial";
}

function searchableTextForItem(
  item: ScheduleItem,
  context: ScheduleFilterContext = {},
): string {
  const holidays = context.holidays ?? new Set();
  const today = context.today ?? todayIso();
  const startDate = effectiveStartDate(item.startDate, today);
  const endDate = addWorkingDays(startDate, item.durationDays, holidays);
  const progress = calculateItemProgress(item, today, holidays);
  const values = [
    `№${item.position}`,
    String(item.position),
    item.section,
    String(item.sheetNumber),
    item.title,
    START_MODE_LABELS[item.startMode],
    startDate,
    formatDateForSearch(startDate),
    item.durationDays === null ? "" : String(item.durationDays),
    endDate ?? "",
    formatDateForSearch(endDate),
    item.assignee ?? "",
    item.status,
    STATUS_LABELS[item.status],
    progress === null ? "" : formatProgress(progress),
  ];
  return normalizeSearchValue(values.join(" "));
}

function formatDateForSearch(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
}

export function filterItems(
  items: ScheduleItem[],
  filters: ScheduleFilters,
  context: ScheduleFilterContext = {},
): ScheduleItem[] {
  const query = normalizeSearchValue(filters.query.trim());
  return items.filter((item) => {
    if (query && !searchableTextForItem(item, context).includes(query)) return false;
    if (filters.section.length > 0 && !filters.section.includes(item.section)) return false;
    if (filters.assignee.length > 0 && (!item.assignee || !filters.assignee.includes(item.assignee))) return false;
    if (filters.status.length > 0 && !filters.status.includes(item.status)) return false;
    return true;
  });
}

export function normalizePositions(items: ScheduleItem[]): ScheduleItem[] {
  return items.map((item, index) => ({ ...item, position: index + 1 }));
}

export function moveItem(
  items: ScheduleItem[],
  activeId: string,
  overId: string,
): ScheduleItem[] {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const overIndex = items.findIndex((item) => item.id === overId);
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
    return normalizePositions(items);
  }
  const next = [...items];
  const [active] = next.splice(activeIndex, 1);
  next.splice(overIndex, 0, active);
  return normalizePositions(next);
}

export function isOverdue(
  item: ScheduleItem,
  today = todayIso(),
  holidays: HolidaySet = new Set(),
): boolean {
  if (item.status === "completed") return false;
  const endDate = addWorkingDays(effectiveStartDate(item.startDate, today), item.durationDays, holidays);
  return endDate !== null && endDate < today;
}

export function uniqueSorted(
  items: ScheduleItem[],
  key: "section" | "assignee",
): string[] {
  const values = new Set<string>();
  for (const item of items) {
    const value = item[key];
    if (value) values.add(value);
  }
  return [...values].sort((a, b) =>
    a.localeCompare(b, "uk-UA", { numeric: true }),
  );
}
