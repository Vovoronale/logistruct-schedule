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
  progressPercentage?: number | null;
  openPanel: WorkspacePanel | null;
  onChange: (filters: ScheduleFilters) => void;
  onTogglePanel: (panel: WorkspacePanel) => void;
  onCompare: () => void;
}

const percentFormatter = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

interface MultiSelectControlProps<T extends string> {
  label: string;
  emptyLabel: string;
  values: T[];
  options: { value: T; label: string }[];
  onChange: (values: T[]) => void;
  className?: string;
}

function MultiSelectControl<T extends string>({
  label,
  emptyLabel,
  values,
  options,
  onChange,
  className = "",
}: MultiSelectControlProps<T>) {
  const toggle = (value: T) => {
    onChange(values.includes(value)
      ? values.filter((candidate) => candidate !== value)
      : [...values, value]);
  };
  const summary = values.length === 0
    ? emptyLabel
    : options
        .filter((option) => values.includes(option.value))
        .map((option) => option.label)
        .join(", ");

  return (
    <details className={`select-control multi-select-control ${className}`}>
      <summary aria-label={label}>{summary}</summary>
      <div className="multi-select-options">
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="checkbox"
              checked={values.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

export function WorkspaceToolbar({
  filters,
  sections,
  assignees,
  visibleCount,
  totalCount,
  progressPercentage = null,
  openPanel,
  onChange,
  onTogglePanel,
  onCompare,
}: WorkspaceToolbarProps) {
  const set = <K extends keyof ScheduleFilters>(key: K, value: ScheduleFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const progressValue =
    progressPercentage === null
      ? null
      : Math.min(100, Math.max(0, progressPercentage));
  const progressLabel = progressValue === null ? null : formatPercent(progressValue);

  return (
    <div className="workspace-toolbar" aria-label="Керування графіком">
      <label className="search-control">
        <SearchIcon />
        <span className="sr-only">Пошук по всіх колонках</span>
        <input
          value={filters.query}
          onChange={(event) => set("query", event.target.value)}
          placeholder="Пошук по всіх колонках"
        />
      </label>
      <MultiSelectControl
        label="Розділ"
        emptyLabel="Усі розділи"
        values={filters.section}
        options={sections.map((section) => ({ value: section, label: section }))}
        onChange={(values) => set("section", values)}
      />
      <MultiSelectControl
        label="Виконавець"
        emptyLabel="Усі виконавці"
        values={filters.assignee}
        options={assignees.map((assignee) => ({ value: assignee, label: assignee }))}
        onChange={(values) => set("assignee", values)}
      />
      <MultiSelectControl
        label="Статус"
        emptyLabel="Усі статуси"
        values={filters.status}
        options={(Object.entries(STATUS_LABELS) as [ScheduleStatus, string][])
          .map(([value, label]) => ({ value, label }))}
        onChange={(values) => set("status", values)}
        className="status-control"
      />
      <span className="workspace-count">{visibleCount} із {totalCount} креслень</span>
      <div className="workspace-actions">
        <button
          className="button secondary compact-action progress-action"
          type="button"
          aria-expanded={openPanel === "progress"}
          aria-controls="progress-panel"
          onClick={() => onTogglePanel("progress")}
        >
          <span>Прогрес</span>
          {progressLabel ? (
            <>
              <span className="toolbar-progress-meter" aria-hidden="true">
                <span
                  className="toolbar-progress-fill"
                  style={{ width: `${progressValue}%` }}
                />
              </span>
              <span className="toolbar-progress-value">{progressLabel}</span>
            </>
          ) : null}
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
