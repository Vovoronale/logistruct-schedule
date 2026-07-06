import { useState } from "react";
import type { ScheduleItem, ScheduleStartMode } from "../types";

interface DependencyEditorProps {
  item: ScheduleItem;
  items: ScheduleItem[];
  error?: string;
  onChange: (patch: Partial<ScheduleItem>) => void;
}

export function DependencyEditor({
  item,
  items,
  error,
  onChange,
}: DependencyEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const candidates = items
    .filter((candidate) => candidate.id !== item.id)
    .sort((left, right) => {
      const leftSameAssignee = item.assignee && left.assignee === item.assignee ? 0 : 1;
      const rightSameAssignee = item.assignee && right.assignee === item.assignee ? 0 : 1;
      return leftSameAssignee - rightSameAssignee || left.position - right.position;
    });
  const byId = new Map(items.map((candidate) => [candidate.id, candidate]));

  const changeMode = (mode: ScheduleStartMode) => {
    onChange(mode === "manual"
      ? { startMode: "manual", predecessorIds: [] }
      : { startMode: "dependencies", startDate: null, predecessorIds: [] });
  };
  const togglePredecessor = (id: string, checked: boolean) => {
    onChange({
      predecessorIds: checked
        ? [...item.predecessorIds, id]
        : item.predecessorIds.filter((predecessorId) => predecessorId !== id),
    });
  };

  return (
    <div className="dependency-editor">
      <select
        className="cell-input dependency-mode-select"
        value={item.startMode}
        aria-label={`Спосіб початку роботи №${item.position}`}
        onChange={(event) => changeMode(event.target.value as ScheduleStartMode)}
      >
        <option value="manual">Датою</option>
        <option value="dependencies">Залежностями</option>
      </select>
      {item.startMode === "dependencies" ? (
        <>
          <details
            className="dependency-picker"
            aria-label="Список залежностей"
            open={pickerOpen}
            onToggle={(event) => setPickerOpen(event.currentTarget.open)}
          >
            <summary>
              {item.predecessorIds.length > 0
                ? `Обрано: ${item.predecessorIds.length}`
                : "Обрати роботи"}
            </summary>
            <div className="dependency-options">
              <div className="dependency-option-list">
                {candidates.map((candidate) => (
                  <label key={candidate.id}>
                    <input
                      type="checkbox"
                      checked={item.predecessorIds.includes(candidate.id)}
                      aria-label={`№${candidate.position} — ${candidate.title}`}
                      onChange={(event) =>
                        togglePredecessor(candidate.id, event.target.checked)}
                    />
                    <span>№{candidate.position} — {candidate.title}</span>
                  </label>
                ))}
                {candidates.length === 0 ? <span>Немає інших робіт</span> : null}
              </div>
              <button
                className="button secondary dependency-done"
                type="button"
                onClick={() => setPickerOpen(false)}
              >
                Готово
              </button>
            </div>
          </details>
          <div className="dependency-chips">
            {item.predecessorIds.map((id) => {
              const predecessor = byId.get(id);
              return predecessor ? (
                <button
                  className="dependency-chip"
                  type="button"
                  key={id}
                  aria-label={`Видалити залежність №${predecessor.position}`}
                  onClick={() => togglePredecessor(id, false)}
                >
                  №{predecessor.position}<span aria-hidden="true"> ×</span>
                </button>
              ) : null;
            })}
          </div>
        </>
      ) : null}
      {error ? <span className="dependency-error" role="alert">{error}</span> : null}
    </div>
  );
}
