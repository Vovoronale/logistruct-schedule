import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { AssigneeDialog } from "./components/AssigneeDialog";
import { AssigneeLegend } from "./components/AssigneeLegend";
import { EditActions } from "./components/EditActions";
import { EmployeeWorkloadPage } from "./components/EmployeeWorkloadPage";
import { LoginDialog } from "./components/LoginDialog";
import { ProgressOverview } from "./components/ProgressOverview";
import { ScheduleGrid } from "./components/ScheduleGrid";
import { ScheduleModes } from "./components/ScheduleModes";
import { Toast } from "./components/Toast";
import { WorkspaceToolbar, type WorkspacePanel, type WorkspaceView } from "./components/WorkspaceToolbar";
import { useSchedule } from "./hooks/useSchedule";
import { useToday } from "./hooks/useToday";
import { useHolidays } from "./hooks/useHolidays";
import { compareSchedules } from "./lib/comparison";
import { buildTimelineDays } from "./lib/dates";
import { dependencyRelations } from "./lib/dependencies";
import { calculateScheduleProgress } from "./lib/progress";
import { filterItems, type ScheduleFilters, uniqueSorted } from "./lib/schedule";
import "./styles.css";

const EMPTY_FILTERS: ScheduleFilters = { query: "", section: [], assignee: [], status: [] };

export default function App() {
  const holidays = useHolidays();
  const schedule = useSchedule(undefined, holidays);
  const today = useToday();
  const [filters, setFilters] = useState<ScheduleFilters>(EMPTY_FILTERS);
  const [loginOpen, setLoginOpen] = useState(false);
  const [assigneeDialogOpen, setAssigneeDialogOpen] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<WorkspacePanel | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("schedule");
  const [comparisonRequested, setComparisonRequested] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const deferredQuery = useDeferredValue(filters.query);
  const effectiveFilters = useMemo(() => ({ ...filters, query: deferredQuery }), [filters, deferredQuery]);
  const filteredItems = useMemo(
    () => filterItems(schedule.items, effectiveFilters, { today, holidays }),
    [effectiveFilters, holidays, schedule.items, today],
  );
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

  const togglePanel = (panel: WorkspacePanel) => {
    setOpenPanel((current) => current === panel ? null : panel);
  };
  const changeView = (view: WorkspaceView) => {
    setActiveView(view);
    setOpenPanel(null);
    if (view === "workload") {
      setAnalysisId(null);
      setComparisonRequested(false);
      schedule.clearComparison();
    }
  };

  useEffect(() => {
    if (openPanel === null) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPanel(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [openPanel]);

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
      <main className="workspace-main">
        <div className="workspace-controls">
          <WorkspaceToolbar
            filters={filters}
            sections={sections}
            assignees={assigneeNames}
            visibleCount={filteredItems.length}
            totalCount={schedule.items.length}
            progressPercentage={progress.overall?.percentage ?? null}
            activeView={activeView}
            openPanel={openPanel}
            onChange={setFilters}
            onViewChange={changeView}
            onTogglePanel={togglePanel}
            onCompare={() => {
              setActiveView("schedule");
              setOpenPanel(null);
              setAnalysisId(null);
              setComparisonRequested(true);
              void schedule.loadHistory();
            }}
          />
          {openPanel === "progress" ? (
            <section className="workspace-popover" id="progress-panel">
              <ProgressOverview progress={progress} />
            </section>
          ) : null}
          {openPanel === "assignees" ? (
            <section className="workspace-popover assignees-popover" id="assignees-panel">
              <AssigneeLegend
                assignees={schedule.assignees}
                visibleAssignees={assignedNames}
                items={schedule.items}
                today={today}
                holidays={holidays}
              />
            </section>
          ) : null}
        </div>
        <div className="workspace-content">
        {schedule.isEditing && activeView === "schedule" ? (
          <EditActions
            dirty={schedule.isDirty}
            canSave={schedule.canSave}
            canUndo={schedule.canUndo}
            saving={schedule.saving}
            error={schedule.dependencyError
              ? `Рядок №${schedule.items.find((item) => item.id === schedule.dependencyError?.itemId)?.position ?? "?"}: ${schedule.dependencyError.message}`
              : undefined}
            onAdd={schedule.addItem}
            onManageAssignees={() => setAssigneeDialogOpen(true)}
            onUndo={schedule.undoLast}
            onSave={() => void save()}
            onCancel={cancel}
          />
        ) : null}
        {activeView === "schedule" && (selectedAnalysisId !== null || comparisonRequested || comparison !== null) ? <ScheduleModes
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
          expanded={comparisonRequested}
          showLauncher={false}
          onSelectRevision={(revision) => {
            setAnalysisId(null);
            void schedule.selectHistoryRevision(revision);
          }}
          onClearComparison={() => {
            setComparisonRequested(false);
            schedule.clearComparison();
          }}
        /> : null}
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
        {!schedule.loading && schedule.saved && activeView === "workload" ? (
          <EmployeeWorkloadPage
            items={schedule.items}
            assignees={schedule.assignees}
            today={today}
            holidays={holidays}
          />
        ) : null}
        {!schedule.loading && schedule.saved && activeView === "schedule" ? (
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
        </div>
      </main>
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
