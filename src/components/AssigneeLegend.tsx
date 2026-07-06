import { useState } from "react";
import type { Assignee } from "../types";
import type { ScheduleItem } from "../types";
import { assigneeFreeDays } from "../lib/assignees";
import { todayIso, type HolidaySet } from "../lib/dates";

interface AssigneeLegendProps {
  assignees: Assignee[];
  visibleAssignees: string[];
  items?: ScheduleItem[];
  today?: string;
  holidays?: HolidaySet;
}

export function AssigneeLegend({
  assignees,
  visibleAssignees,
  items = [],
  today = todayIso(),
  holidays = new Set(),
}: AssigneeLegendProps) {
  const [targetDate, setTargetDate] = useState(today);
  const entries = visibleAssignees.length > 0
    ? assignees.filter((person) => visibleAssignees.includes(person.name))
    : assignees.slice(0, 8);
  return (
    <div className="assignee-panel">
      <label className="assignee-free-date">
        <span>Вільні дні до</span>
        <input
          aria-label="Дата для розрахунку вільних днів"
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
        />
      </label>
      <div className="assignee-legend" aria-label="Кольори виконавців">
        {entries.map((person) => (
          <span className="legend-item" key={person.id}>
            <i style={{ backgroundColor: person.color }} />
            <span>{person.name}</span>
            <small>
              Вільно: {assigneeFreeDays(items, person.name, targetDate, today, holidays)} дн.
            </small>
          </span>
        ))}
      </div>
    </div>
  );
}
