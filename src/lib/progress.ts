import type { ScheduleItem } from "../types";
import { addWorkingDays, workingDaysAfter, type HolidaySet } from "./dates";

export interface ProgressSummary {
  percentage: number;
  sheetCount: number;
  totalDays: number;
}

export interface SectionProgress extends ProgressSummary {
  section: string;
}

export interface ScheduleProgress {
  overall: ProgressSummary | null;
  sections: SectionProgress[];
}

export function calculateItemProgress(
  item: ScheduleItem,
  today: string,
  holidays: HolidaySet = new Set(),
): number | null {
  if (
    !addWorkingDays(item.startDate, item.durationDays, holidays) ||
    item.durationDays === null
  ) {
    return null;
  }
  if (item.status === "completed") return 100;

  const elapsed = workingDaysAfter(item.startDate!, today, holidays);
  if (elapsed === null) return null;
  return Math.min(95, Math.max(0, (elapsed / item.durationDays) * 100));
}

export function calculateScheduleProgress(
  items: ScheduleItem[],
  today: string,
  holidays: HolidaySet = new Set(),
): ScheduleProgress {
  const groups = new Map<
    string,
    { earned: number; sheetCount: number; totalDays: number }
  >();
  let overallEarned = 0;
  let overallDays = 0;
  let overallCount = 0;

  for (const item of items) {
    const percentage = calculateItemProgress(item, today, holidays);
    if (percentage === null || item.durationDays === null) continue;

    const section = item.section.trim();
    if (!section) continue;

    const earned = item.durationDays * percentage;
    const group = groups.get(section) ?? {
      earned: 0,
      sheetCount: 0,
      totalDays: 0,
    };
    group.earned += earned;
    group.sheetCount += 1;
    group.totalDays += item.durationDays;
    groups.set(section, group);

    overallEarned += earned;
    overallCount += 1;
    overallDays += item.durationDays;
  }

  const sections = [...groups.entries()]
    .map(([section, value]) => ({
      section,
      sheetCount: value.sheetCount,
      totalDays: value.totalDays,
      percentage: value.earned / value.totalDays,
    }))
    .sort((a, b) =>
      a.section.localeCompare(b.section, "uk-UA", {
        numeric: true,
        sensitivity: "base",
      }),
    );

  return {
    overall:
      overallDays === 0
        ? null
        : {
            percentage: overallEarned / overallDays,
            sheetCount: overallCount,
            totalDays: overallDays,
          },
    sections,
  };
}
