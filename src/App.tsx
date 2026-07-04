import { useDeferredValue, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { AssigneeDialog } from "./components/AssigneeDialog";
import { AssigneeLegend } from "./components/AssigneeLegend";
import { EditActions } from "./components/EditActions";
import { FilterBar } from "./components/FilterBar";
import { LoginDialog } from "./components/LoginDialog";
import { ProgressOverview } from "./components/ProgressOverview";
import { ScheduleGrid } from "./components/ScheduleGrid";
import { ScheduleModes } from "./components/ScheduleModes";
import { Toast } from "./components/Toast";
import { useSchedule } from "./hooks/useSchedule";
import { useToday } from "./hooks/useToday";
import { useHolidays } from "./hooks/useHolidays";
import { compareSchedules } from "./lib/comparison";
import { buildTimelineDays } from "./lib/dates";
import { dependencyRelations } from "./lib/dependencies";
import { calculateScheduleProgress } from "./lib/progress";
import { filterItems, type ScheduleFilters, uniqueSorted } from "./lib/schedule";
import "./styles.css";

const EMPTY_FILTERS: ScheduleFilters = { query: "", section: "", assignee: "", status: "" };

export default function App() {
  const holidays = useHolidays();
  const schedule = useSchedule(undefined, holidays);
  const today = useToday();
  const [filters, setFilters] = useState<ScheduleFilters>(EMPTY_FILTERS);
  const [loginOpen, setLoginOpen] = useState(false);
  const [assigneeDialogOpen, setAssigneeDialogOpen] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const deferredQuery = useDeferredValue(filters.query);
  const effectiveFilters = useMemo(() => ({ ...filters, query: deferredQuery }), [filters, deferredQuery]);
  const filteredItems = useMemo(() => filterItems(schedule.items, effectiveFilters), [schedule.items, effectiveFilters]);
  const comparison = useMemo(
    () => schedule.comparisonSnapshot && schedule.saved
      ? compareSchedules(schedule.saved.items, schedule.comparisonSnapshot.items)
      : null,
    [schedule.comparisonSnapshot, schedule.saved],
  );
  const timelineItems = useMemo(
    () => schedule.comparisonSnapshot
      ? [...schedule.items, ...schedule.comparisonSnapshot.items]
      : schedule.items,
    [schedule.comparisonSnapshot, schedule.items],
  );
  const timelineDays = useMemo(
    () => buildTimelineDays(timelineItems, today, holidays),
    [timelineItems, today, holidays],
  );
  const progress = useMemo(
    () => calculateScheduleProgress(schedule.items, today, holidays),
    [schedule.items, today, holidays],
  );
  const sections = useMemo(() => uniqueSorted(schedule.items, "section"), [schedule.items]);
  const assignedNames = useMemo(() => uniqueSorted(schedule.items, "assignee"), [schedule.items]);
  const assigneeNames = useMemo(() => {
    const configured = schedule.assignees.map((person) => person.name);
    return [...configured, ...assignedNames.filter((name) => !configured.includes(name))];
  }, [assignedNames, schedule.assignees]);
  const selectedAnalysisId = analysisId && schedule.items.some((item) => item.id === analysisId)
    ? analysisId
    : null;
  const relations = useMemo(
    () => selectedAnalysisId
      ? dependencyRelations(schedule.items, selectedAnalysisId)
      : { predecessors: new Set<string>(), successors: new Set<string>() },
    [schedule.items, selectedAnalysisId],
  );

  const requestEdit = () => {
    if (!schedule.beginEditing()) setLoginOpen(true);
  };
  const cancel = () => {
    if (schedule.isDirty && !window.confirm("Скасувати всі незбережені зміни?")) return;
    schedule.cancel();
    setAssigneeDialogOpen(false);
  };
  const save = async () => {
    try {
      await schedule.save();
      setToast({ message: "Графік успішно збережено", tone: "success" });
    } catch {
      setToast({ message: schedule.error ?? "Не вдалося зберегти графік", tone: "error" });
    }
  };
  const remove = (id: string) => {
    if (window.confirm("Видалити цей рядок із графіка?")) schedule.removeItem(id);
  };
  const refresh = () => {
    if (schedule.isDirty && !window.confirm("Оновити сторінку та втратити незбережені зміни?")) return;
    void schedule.load();
  };

  return (
    <div className="app-shell">
      <AppHeader
        updatedAt={schedule.saved?.updatedAt}
        authenticated={schedule.authenticated}
        isEditing={schedule.isEditing}
        onEdit={requestEdit}
        onRefresh={refresh}
        onLogout={() => void schedule.logout()}
      />
      <main>
        <FilterBar filters={filters} sections={sections} assignees={assigneeNames} onChange={setFilters} />
        <div className="legend-row">
          <span>{filteredItems.length} із {schedule.items.length} креслень</span>
          <AssigneeLegend assignees={schedule.assignees} visibleAssignees={assignedNames} />
        </div>
        {schedule.isEditing ? (
          <EditActions
            dirty={schedule.isDirty}
            canSave={schedule.canSave}
            saving={schedule.saving}
            error={schedule.dependencyError?.message}
            onAdd={schedule.addItem}
            onManageAssignees={() => setAssigneeDialogOpen(true)}
            onSave={() => void save()}
            onCancel={cancel}
          />
        ) : null}
        {!schedule.loading && schedule.saved ? (
          <ProgressOverview progress={progress} />
        ) : null}
        <ScheduleModes
          analysisActive={selectedAnalysisId !== null}
          onClearAnalysis={() => setAnalysisId(null)}
          editing={schedule.isEditing}
          history={schedule.history}
          historyLoading={schedule.historyLoading}
          historyError={schedule.historyError}
          comparison={comparison}
          selectedRevision={schedule.comparisonSnapshot?.revision}
          onOpenComparison={() => {
            setAnalysisId(null);
            void schedule.loadHistory();
          }}
          onSelectRevision={(revision) => {
            setAnalysisId(null);
            void schedule.selectHistoryRevision(revision);
          }}
          onClearComparison={schedule.clearComparison}
        />
        {schedule.loading ? (
          <div className="loading-state" role="status"><span /><p>Завантажуємо графік…</p></div>
        ) : null}
        {!schedule.loading && schedule.error && !schedule.saved ? (
          <div className="error-state" role="alert">
            <strong>Не вдалося відкрити графік</strong>
            <p>{schedule.error}</p>
            <button className="button secondary" type="button" onClick={() => void schedule.load()}>Спробувати ще раз</button>
          </div>
        ) : null}
        {!schedule.loading && schedule.saved ? (
          <section className="schedule-frame" aria-label="Графік креслень">
            <ScheduleGrid
              items={filteredItems}
              allItems={schedule.items}
              timelineDays={timelineDays}
              today={today}
              holidays={holidays}
              editing={schedule.isEditing}
              assignees={schedule.assignees}
              dependencyError={schedule.dependencyError}
              selectedAnalysisId={selectedAnalysisId}
              predecessorIds={relations.predecessors}
              successorIds={relations.successors}
              onToggleAnalysis={(id) => {
                schedule.clearComparison();
                setAnalysisId((current) => current === id ? null : id);
              }}
              comparison={comparison}
              previousItems={schedule.comparisonSnapshot?.items}
              onUpdate={schedule.updateItem}
              onDelete={remove}
              onReorder={schedule.reorderItem}
              onMoveBy={schedule.moveBy}
            />
          </section>
        ) : null}
      </main>
      <footer className="app-footer">
        <span>Публічний перегляд · Cloudflare Pages</span>
        <span>Дата завершення рахується в робочих днях</span>
      </footer>
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={schedule.login} />
      <AssigneeDialog
        open={assigneeDialogOpen}
        assignees={schedule.assignees}
        items={schedule.items}
        onClose={() => setAssigneeDialogOpen(false)}
        onApply={schedule.replaceAssignees}
      />
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
