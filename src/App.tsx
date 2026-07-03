import { useDeferredValue, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { AssigneeLegend } from "./components/AssigneeLegend";
import { EditActions } from "./components/EditActions";
import { FilterBar } from "./components/FilterBar";
import { LoginDialog } from "./components/LoginDialog";
import { ScheduleGrid } from "./components/ScheduleGrid";
import { Toast } from "./components/Toast";
import { useSchedule } from "./hooks/useSchedule";
import { buildTimelineDays } from "./lib/dates";
import { filterItems, type ScheduleFilters, uniqueSorted } from "./lib/schedule";
import "./styles.css";

const EMPTY_FILTERS: ScheduleFilters = { query: "", section: "", assignee: "", status: "" };

export default function App() {
  const schedule = useSchedule();
  const [filters, setFilters] = useState<ScheduleFilters>(EMPTY_FILTERS);
  const [loginOpen, setLoginOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const deferredQuery = useDeferredValue(filters.query);
  const effectiveFilters = useMemo(() => ({ ...filters, query: deferredQuery }), [filters, deferredQuery]);
  const filteredItems = useMemo(() => filterItems(schedule.items, effectiveFilters), [schedule.items, effectiveFilters]);
  const timelineDays = useMemo(() => buildTimelineDays(schedule.items), [schedule.items]);
  const sections = useMemo(() => uniqueSorted(schedule.items, "section"), [schedule.items]);
  const assignees = useMemo(() => uniqueSorted(schedule.items, "assignee"), [schedule.items]);

  const requestEdit = () => {
    if (!schedule.beginEditing()) setLoginOpen(true);
  };
  const cancel = () => {
    if (schedule.isDirty && !window.confirm("Скасувати всі незбережені зміни?")) return;
    schedule.cancel();
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
        <FilterBar filters={filters} sections={sections} assignees={assignees} onChange={setFilters} />
        <div className="legend-row">
          <span>{filteredItems.length} із {schedule.items.length} креслень</span>
          <AssigneeLegend visibleAssignees={assignees} />
        </div>
        {schedule.isEditing ? (
          <EditActions dirty={schedule.isDirty} saving={schedule.saving} onAdd={schedule.addItem} onSave={() => void save()} onCancel={cancel} />
        ) : null}
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
              timelineDays={timelineDays}
              editing={schedule.isEditing}
              assignees={Object.keys({ ІВ: 1, Втк: 1, Єв: 1, Ол: 1, Ми: 1, Ро: 1, Ва: 1, Іг: 1, На: 1, Вта: 1, Тр: 1, Вв: 1, Ай: 1, Юл: 1, Оо: 1, Тн: 1, Св: 1 })}
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
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
