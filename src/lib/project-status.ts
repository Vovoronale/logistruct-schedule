import type { ScheduleStatus, ScheduleItem } from "../types";
import type { HolidaySet } from "./dates";
import { calculateScheduleProgress } from "./progress";

export interface StatusSummary {
  percentage: number | null;
  total: number;
  completed: number;
  inProgress: number;
  planned: number;
}

export interface ProjectStatus {
  overall: StatusSummary;
  kb: StatusSummary;
  km: StatusSummary;
}

function summarize(
  items: ScheduleItem[],
  today: string,
  holidays: HolidaySet,
): StatusSummary {
  const counts: Record<ScheduleStatus, number> = {
    planned: 0,
    in_progress: 0,
    completed: 0,
  };
  items.forEach((item) => { counts[item.status] += 1; });

  return {
    percentage: calculateScheduleProgress(items, today, holidays).overall?.percentage ?? null,
    total: items.length,
    completed: counts.completed,
    inProgress: counts.in_progress,
    planned: counts.planned,
  };
}

export function buildProjectStatus(
  items: ScheduleItem[],
  today: string,
  holidays: HolidaySet = new Set(),
): ProjectStatus {
  const kbItems = items.filter((item) => /^(КЗ|КБ)/iu.test(item.section.trim()));
  const kmItems = items.filter((item) => /^КМ/iu.test(item.section.trim()));

  return {
    overall: summarize(items, today, holidays),
    kb: summarize(kbItems, today, holidays),
    km: summarize(kmItems, today, holidays),
  };
}
