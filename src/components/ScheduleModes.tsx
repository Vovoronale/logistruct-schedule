import { useState } from "react";
import type {
  ScheduleComparison,
  ScheduleHistoryEntry,
} from "../types";

interface ScheduleModesProps {
  analysisActive: boolean;
  onClearAnalysis: () => void;
  editing?: boolean;
  history?: ScheduleHistoryEntry[];
  historyLoading?: boolean;
  historyError?: string | null;
  comparison?: ScheduleComparison | null;
  selectedRevision?: number;
  onOpenComparison?: () => void;
  onSelectRevision?: (revision: number) => void;
  onClearComparison?: () => void;
}

function historyLabel(entry: ScheduleHistoryEntry): string {
  const formatted = new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(entry.savedAt));
  return `Версія ${entry.revision} · ${formatted}`;
}

export function ScheduleModes({
  analysisActive,
  onClearAnalysis,
  editing = false,
  history = [],
  historyLoading = false,
  historyError = null,
  comparison = null,
  selectedRevision,
  onOpenComparison,
  onSelectRevision,
  onClearComparison,
}: ScheduleModesProps) {
  const [historyRequested, setHistoryRequested] = useState(false);

  if (analysisActive) {
    return (
      <div className="schedule-modes dependency-analysis-legend" role="status">
        <strong>Ланцюжок залежностей</strong>
        <span className="analysis-key predecessor-key">Попередники</span>
        <span className="analysis-key selected-key">Вибрана робота</span>
        <span className="analysis-key successor-key">Наступники</span>
        <span className="hidden-dependency-key">… — пов’язана робота прихована фільтром</span>
        <button className="button ghost" type="button" onClick={onClearAnalysis}>
          Очистити підсвічування
        </button>
      </div>
    );
  }

  const showHistory = historyRequested || comparison !== null;
  return (
    <div className="schedule-modes comparison-toolbar">
      <button
        className="button secondary"
        type="button"
        disabled={editing}
        title={editing ? "Спочатку збережіть або скасуйте зміни" : undefined}
        onClick={() => {
          setHistoryRequested(true);
          onOpenComparison?.();
        }}
      >
        Порівняти
      </button>
      {showHistory ? (
        <>
          <label className="comparison-select">
            <span>Версія для порівняння</span>
            <select
              value={selectedRevision ?? ""}
              disabled={historyLoading || history.length === 0}
              onChange={(event) => {
                if (event.target.value) onSelectRevision?.(Number(event.target.value));
              }}
            >
              <option value="">Оберіть версію</option>
              {history.map((entry) => (
                <option value={entry.revision} key={entry.revision}>
                  {historyLabel(entry)}
                </option>
              ))}
            </select>
          </label>
          {historyLoading ? <span role="status">Завантажуємо історію…</span> : null}
          {!historyLoading && historyRequested && history.length === 0 && !historyError
            ? <span>Попередніх версій ще немає</span>
            : null}
          {historyError ? <span className="form-error" role="alert">{historyError}</span> : null}
        </>
      ) : null}
      {comparison ? (
        <>
          <span>Додано: {comparison.addedIds.length}</span>
          <span>Видалено: {comparison.removedItems.length}</span>
          <span>Перенесено: {comparison.rescheduledIds.length}</span>
          <span>Змінено: {comparison.changed.length}</span>
          <button className="button ghost" type="button" onClick={onClearComparison}>
            Закрити порівняння
          </button>
        </>
      ) : null}
    </div>
  );
}
