import type { ScheduleItem, ScheduleStatus } from "../types";
import { addWorkingDays, todayIso, type HolidaySet } from "./dates";

export interface ScheduleFilters {
  query: string;
  section: string;
  assignee: string;
  status: ScheduleStatus | "";
}

export const STATUS_LABELS: Readonly<Record<ScheduleStatus, string>> = {
  planned: "Заплановано",
  in_progress: "У роботі",
  completed: "Завершено",
};

export function filterItems(
  items: ScheduleItem[],
  filters: ScheduleFilters,
): ScheduleItem[] {
  const query = filters.query.trim().toLocaleLowerCase("uk-UA");
  return items.filter((item) => {
    if (query && !item.title.toLocaleLowerCase("uk-UA").includes(query)) return false;
    if (filters.section && item.section !== filters.section) return false;
    if (filters.assignee && item.assignee !== filters.assignee) return false;
    if (filters.status && item.status !== filters.status) return false;
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
  const endDate = addWorkingDays(item.startDate, item.durationDays, holidays);
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
