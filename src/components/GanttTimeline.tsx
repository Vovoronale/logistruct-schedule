import type { ScheduleItem } from "../types";
import { addWorkingDays, dayNumber, formatMonth, isWeekend, weekdayLabel } from "../lib/dates";
import { assigneeColor, readableTextColor } from "../lib/colors";

interface MonthGroup { label: string; count: number; }

function monthGroups(days: string[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const day of days) {
    const label = formatMonth(day);
    const last = groups.at(-1);
    if (last?.label === label) last.count += 1;
    else groups.push({ label, count: 1 });
  }
  return groups;
}

export function GanttMonthHeaders({ days }: { days: string[] }) {
  return monthGroups(days).map((group) => (
    <th className="month-header" colSpan={group.count} key={group.label}>{group.label}</th>
  ));
}

export function GanttDayHeaders({ days }: { days: string[] }) {
  return days.map((day) => (
    <th className={`day-header ${isWeekend(day) ? "weekend" : ""}`} key={day} title={day}>
      <span>{dayNumber(day)}</span>
      <small>{weekdayLabel(day)}</small>
    </th>
  ));
}

export function GanttCells({ item, days }: { item: ScheduleItem; days: string[] }) {
  const end = addWorkingDays(item.startDate, item.durationDays);
  const active = days.map((day) => Boolean(item.startDate && end && day >= item.startDate && day < end));
  const color = assigneeColor(item.assignee);
  const textColor = readableTextColor(color);
  return days.map((day, index) => {
    const isActive = active[index];
    const isFirst = isActive && !active[index - 1];
    const isLast = isActive && !active[index + 1];
    return (
      <td className={`timeline-cell ${isWeekend(day) ? "weekend" : ""}`} key={day}>
        {isActive ? (
          <span
            className={`gantt-bar ${isFirst ? "first" : ""} ${isLast ? "last" : ""}`}
            style={{ backgroundColor: color, color: textColor }}
            title={`${item.title}: ${item.startDate} — ${end}`}
          >
            {isFirst ? (item.assignee ?? "—") : ""}
          </span>
        ) : null}
      </td>
    );
  });
}
