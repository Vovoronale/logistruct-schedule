import type { Assignee, ScheduleItem } from "../types";
import {
  addWorkingDays,
  buildTimelineDays,
  effectiveStartDate,
  workingDaysBetween,
  type HolidaySet,
} from "./dates";
import { assigneeColor } from "./colors";

export interface WorkloadBar {
  item: ScheduleItem;
  startDate: string;
  endDate: string;
  lane: number;
}

export interface EmployeeWorkloadRow {
  assignee: Assignee;
  bars: WorkloadBar[];
  activeItems: WorkloadBar[];
  releaseDate: string | null;
  maxConcurrent: number;
  loadByDay: Map<string, number>;
}

export interface EmployeeWorkloadSummary {
  rows: EmployeeWorkloadRow[];
  timelineDays: string[];
  unassignedCount: number;
}

interface WorkloadInput {
  assignees: Assignee[];
  items: ScheduleItem[];
  today: string;
  holidays?: HolidaySet;
}

const collator = new Intl.Collator("uk-UA", {
  numeric: true,
  sensitivity: "base",
});

function discoveredAssignees(items: ScheduleItem[], configured: Assignee[]): Assignee[] {
  const configuredNames = new Set(configured.map((person) => person.name));
  const discovered = [...new Set(items.map((item) => item.assignee).filter(Boolean) as string[])]
    .filter((name) => !configuredNames.has(name))
    .sort((left, right) => collator.compare(left, right))
    .map((name, index) => ({
      id: `discovered-${name}`,
      name,
      color: assigneeColor(name),
      position: configured.length + index + 1,
      createdAt: "",
      updatedAt: "",
    }));

  return [...configured, ...discovered];
}

function assignLanes(bars: Omit<WorkloadBar, "lane">[]): WorkloadBar[] {
  const laneEnds: string[] = [];
  return bars
    .sort((left, right) =>
      left.startDate.localeCompare(right.startDate)
      || left.endDate.localeCompare(right.endDate)
      || left.item.position - right.item.position)
    .map((bar) => {
      const lane = laneEnds.findIndex((endDate) => endDate < bar.startDate);
      const nextLane = lane === -1 ? laneEnds.length : lane;
      laneEnds[nextLane] = bar.endDate;
      return { ...bar, lane: nextLane };
    });
}

export function buildEmployeeWorkloads({
  assignees,
  items,
  today,
  holidays = new Set(),
}: WorkloadInput): EmployeeWorkloadSummary {
  const people = discoveredAssignees(items, assignees);
  const timelineDays = buildTimelineDays(items, today, holidays);
  const unassignedCount = items.filter((item) => !item.assignee).length;

  const rows = people.map((person) => {
    const scheduled = items
      .filter((item) => item.assignee === person.name)
      .map((item) => {
        const startDate = effectiveStartDate(item.startDate, today);
        const endDate = addWorkingDays(startDate, item.durationDays, holidays);
        return endDate ? { item, startDate, endDate } : null;
      })
      .filter((bar): bar is Omit<WorkloadBar, "lane"> => bar !== null);
    const bars = assignLanes(scheduled);
    const loadByDay = new Map<string, number>();

    for (const bar of bars) {
      for (const day of workingDaysBetween(bar.startDate, bar.endDate, holidays)) {
        loadByDay.set(day, (loadByDay.get(day) ?? 0) + 1);
      }
    }

    const activeItems = bars.filter((bar) =>
      bar.item.status !== "completed"
      && bar.startDate <= today
      && today <= bar.endDate);
    const releaseDate = bars
      .filter((bar) => bar.item.status !== "completed" && bar.endDate >= today)
      .map((bar) => bar.endDate)
      .sort()
      .at(-1) ?? null;

    return {
      assignee: person,
      bars,
      activeItems,
      releaseDate,
      maxConcurrent: Math.max(0, ...loadByDay.values()),
      loadByDay,
    };
  });

  return { rows, timelineDays, unassignedCount };
}
