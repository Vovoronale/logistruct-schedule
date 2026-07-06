import type { ScheduleFilters } from "../lib/schedule";
import type { ScheduleStatus } from "../types";
import { STATUS_LABELS } from "../lib/schedule";
import { SearchIcon } from "./Icons";

interface FilterBarProps {
  filters: ScheduleFilters;
  sections: string[];
  assignees: string[];
  onChange: (filters: ScheduleFilters) => void;
}

export function FilterBar({ filters, sections, assignees, onChange }: FilterBarProps) {
  const set = <K extends keyof ScheduleFilters>(key: K, value: ScheduleFilters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="filter-bar" aria-label="Фільтри графіка">
      <label className="search-control">
        <SearchIcon />
        <span className="sr-only">Пошук по всіх колонках</span>
        <input
          value={filters.query}
          onChange={(event) => set("query", event.target.value)}
          placeholder="Пошук по всіх колонках"
        />
      </label>
      <label className="select-control">
        <span className="sr-only">Розділ</span>
        <select value={filters.section} onChange={(event) => set("section", event.target.value)}>
          <option value="">Усі розділи</option>
          {sections.map((section) => <option key={section}>{section}</option>)}
        </select>
      </label>
      <label className="select-control">
        <span className="sr-only">Виконавець</span>
        <select value={filters.assignee} onChange={(event) => set("assignee", event.target.value)}>
          <option value="">Усі виконавці</option>
          {assignees.map((assignee) => <option key={assignee}>{assignee}</option>)}
        </select>
      </label>
      <label className="select-control">
        <span className="sr-only">Статус</span>
        <select
          value={filters.status}
          onChange={(event) => set("status", event.target.value as ScheduleStatus | "")}
        >
          <option value="">Усі статуси</option>
          {(Object.entries(STATUS_LABELS) as [ScheduleStatus, string][]).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <span className="filter-hint">Фільтри синхронізовані з календарем</span>
    </div>
  );
}
