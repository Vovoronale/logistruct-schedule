import type { Assignee, ScheduleItem } from "../types";
import { addWorkingDays, dayNumber, formatMonth, isWeekend, todayIso, weekdayLabel } from "../lib/dates";
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

export function GanttDayHeaders({ days, today = todayIso() }: { days: string[]; today?: string }) {
  return days.map((day) => (
    <th
      className={`day-header ${isWeekend(day) ? "weekend" : ""} ${day === today ? "today" : day < today ? "past" : ""}`}
      data-today={day === today ? "true" : undefined}
      aria-label={day === today ? "Сьогодні" : undefined}
      key={day}
      title={day}
    >
      <span>{dayNumber(day)}</span>
      <small>{weekdayLabel(day)}</small>
    </th>
  ));
}

export function GanttCells({ item, days, assignees, today = todayIso() }: { item: ScheduleItem; days: string[]; assignees: Assignee[]; today?: string }) {
  const end = addWorkingDays(item.startDate, item.durationDays);
  const active = days.map((day) => Boolean(item.startDate && end && day >= item.startDate && day < end));
  const color = assigneeColor(item.assignee, assignees);
  const textColor = readableTextColor(color);
  return days.map((day, index) => {
    const isActive = active[index];
    const isFirst = isActive && !active[index - 1];
    const isLast = isActive && !active[index + 1];
    const isPast = day < today;
    return (
      <td
        className={`timeline-cell ${isWeekend(day) ? "weekend" : ""} ${day === today ? "today" : isPast ? "past" : ""}`}
        data-date={day}
        key={day}
      >
        {isActive ? (
          <span
            className={`gantt-bar ${isFirst ? "first" : ""} ${isLast ? "last" : ""} ${isPast ? "past-bar" : ""}`}
            style={isPast
              ? { backgroundColor: "#A8B0BC", color: "#FFFFFF" }
              : { backgroundColor: color, color: textColor }}
            title={`${item.title}: ${item.startDate} — ${end}`}
          >
            {isFirst ? (item.assignee ?? "—") : ""}
          </span>
        ) : null}
      </td>
    );
  });
}
