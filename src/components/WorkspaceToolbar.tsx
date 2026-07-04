import type { ScheduleFilters } from "../lib/schedule";
import { STATUS_LABELS } from "../lib/schedule";
import type { ScheduleStatus } from "../types";
import { SearchIcon } from "./Icons";

export type WorkspacePanel = "progress" | "assignees";

interface WorkspaceToolbarProps {
  filters: ScheduleFilters;
  sections: string[];
  assignees: string[];
  visibleCount: number;
  totalCount: number;
  openPanel: WorkspacePanel | null;
  onChange: (filters: ScheduleFilters) => void;
  onTogglePanel: (panel: WorkspacePanel) => void;
  onCompare: () => void;
}

export function WorkspaceToolbar({
  filters,
  sections,
  assignees,
  visibleCount,
  totalCount,
  openPanel,
  onChange,
  onTogglePanel,
  onCompare,
}: WorkspaceToolbarProps) {
  const set = <K extends keyof ScheduleFilters>(key: K, value: ScheduleFilters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="workspace-toolbar" aria-label="Керування графіком">
      <label className="search-control">
        <SearchIcon />
        <span className="sr-only">Пошук креслення</span>
        <input
          value={filters.query}
          onChange={(event) => set("query", event.target.value)}
          placeholder="Пошук креслення"
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
      <label className="select-control status-control">
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
      <span className="workspace-count">{visibleCount} із {totalCount} креслень</span>
      <div className="workspace-actions">
        <button
          className="button secondary compact-action"
          type="button"
          aria-expanded={openPanel === "progress"}
          aria-controls="progress-panel"
          onClick={() => onTogglePanel("progress")}
        >
          Прогрес
        </button>
        <button
          className="button secondary compact-action"
          type="button"
          aria-expanded={openPanel === "assignees"}
          aria-controls="assignees-panel"
          onClick={() => onTogglePanel("assignees")}
        >
          Виконавці
        </button>
        <button className="button secondary compact-action" type="button" onClick={onCompare}>
          Порівняти
        </button>
      </div>
    </div>
  );
}
