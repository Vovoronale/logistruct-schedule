import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import type { ScheduleItem, ScheduleStatus } from "../types";
import { addWorkingDays, formatDate } from "../lib/dates";
import { isOverdue, STATUS_LABELS } from "../lib/schedule";
import { ChevronDownIcon, ChevronUpIcon, GripIcon, TrashIcon } from "./Icons";
import { GanttCells, GanttDayHeaders, GanttMonthHeaders } from "./GanttTimeline";

interface ScheduleGridProps {
  items: ScheduleItem[];
  timelineDays: string[];
  editing: boolean;
  assignees: string[];
  onUpdate: (id: string, patch: Partial<ScheduleItem>) => void;
  onDelete: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onMoveBy: (id: string, delta: -1 | 1) => void;
}

interface RowProps extends Omit<ScheduleGridProps, "items" | "onReorder"> {
  item: ScheduleItem;
  rowIndex: number;
  rowCount: number;
}

function SortableScheduleRow({ item, rowIndex, rowCount, timelineDays, editing, onUpdate, onDelete, onMoveBy }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !editing });
  const style = { transform: CSS.Transform.toString(transform), transition } as CSSProperties;
  const endDate = addWorkingDays(item.startDate, item.durationDays);
  const overdue = isOverdue(item);

  return (
    <tr ref={setNodeRef} style={style} className={`${item.status === "completed" ? "completed-row" : ""} ${overdue ? "overdue-row" : ""} ${isDragging ? "dragging" : ""}`}>
      <td className="sticky-col col-number row-number">
        {editing ? (
          <button className="drag-handle" type="button" aria-label={`Перемістити рядок ${item.position}`} {...attributes} {...listeners}><GripIcon /></button>
        ) : null}
        <span>{item.position}</span>
      </td>
      <td className="sticky-col col-section">
        {editing ? <input className="cell-input compact" value={item.section} onChange={(e) => onUpdate(item.id, { section: e.target.value })} aria-label={`Розділ рядка ${item.position}`} /> : <span className={`section-badge ${item.section.startsWith("КМ") ? "metal" : "concrete"}`}>{item.section}</span>}
      </td>
      <td className="sticky-col col-sheet">
        {editing ? <input className="cell-input numeric" type="number" min="1" value={item.sheetNumber} onChange={(e) => onUpdate(item.id, { sheetNumber: Number(e.target.value) })} aria-label={`Номер листа рядка ${item.position}`} /> : item.sheetNumber}
      </td>
      <td className="sticky-col col-title">
        <div className="title-cell">
          {editing ? <textarea className="cell-input title-input" value={item.title} onChange={(e) => onUpdate(item.id, { title: e.target.value })} aria-label={`Назва креслення рядка ${item.position}`} /> : <span>{item.title}</span>}
          {editing ? <button type="button" className="delete-row" onClick={() => onDelete(item.id)} aria-label={`Видалити рядок ${item.position}`}><TrashIcon /></button> : null}
        </div>
      </td>
      <td>{editing ? <input className="cell-input date" type="date" value={item.startDate ?? ""} onChange={(e) => onUpdate(item.id, { startDate: e.target.value || null })} aria-label={`Дата початку рядка ${item.position}`} /> : formatDate(item.startDate)}</td>
      <td className="duration-cell">{editing ? <input className="cell-input numeric" type="number" min="1" value={item.durationDays ?? ""} onChange={(e) => onUpdate(item.id, { durationDays: e.target.value ? Number(e.target.value) : null })} aria-label={`Робочі дні рядка ${item.position}`} /> : (item.durationDays ?? "—")}</td>
      <td>{formatDate(endDate)}</td>
      <td>{editing ? <input className="cell-input compact" list="assignee-options" value={item.assignee ?? ""} onChange={(e) => onUpdate(item.id, { assignee: e.target.value || null })} aria-label={`Виконавець рядка ${item.position}`} /> : <span className="assignee-code">{item.assignee ?? "—"}</span>}</td>
      <td>
        {editing ? (
          <div className="status-edit-wrap">
            <select className="cell-input status-select" value={item.status} onChange={(e) => onUpdate(item.id, { status: e.target.value as ScheduleStatus })} aria-label={`Статус рядка ${item.position}`}>
              {(Object.entries(STATUS_LABELS) as [ScheduleStatus, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <span className="row-move-buttons">
              <button type="button" disabled={rowIndex === 0} onClick={() => onMoveBy(item.id, -1)} aria-label={`Підняти рядок ${item.position}`}><ChevronUpIcon /></button>
              <button type="button" disabled={rowIndex === rowCount - 1} onClick={() => onMoveBy(item.id, 1)} aria-label={`Опустити рядок ${item.position}`}><ChevronDownIcon /></button>
            </span>
          </div>
        ) : <span className={`status-badge ${item.status}`}>{STATUS_LABELS[item.status]}</span>}
      </td>
      {timelineDays.length > 0 ? <GanttCells item={item} days={timelineDays} /> : (
        <td className="empty-timeline-cell">{rowIndex === 0 ? <span>Дати ще не заплановані</span> : null}</td>
      )}
    </tr>
  );
}

export function ScheduleGrid(props: ScheduleGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) props.onReorder(String(active.id), String(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className={`schedule-scroller ${props.editing ? "is-editing" : ""}`}>
        <table className="schedule-table">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky-col col-number">№</th>
              <th rowSpan={2} className="sticky-col col-section">Розділ</th>
              <th rowSpan={2} className="sticky-col col-sheet">№ листа</th>
              <th rowSpan={2} className="sticky-col col-title">Найменування креслення</th>
              <th rowSpan={2}>Початок</th>
              <th rowSpan={2}>Робочі дні</th>
              <th rowSpan={2}>Завершення</th>
              <th rowSpan={2}>Виконавець</th>
              <th rowSpan={2}>Статус</th>
              {props.timelineDays.length > 0 ? <GanttMonthHeaders days={props.timelineDays} /> : <th rowSpan={2} className="empty-timeline-header">Календар робіт</th>}
            </tr>
            {props.timelineDays.length > 0 ? <tr><GanttDayHeaders days={props.timelineDays} /></tr> : null}
          </thead>
          <SortableContext items={props.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {props.items.map((item, index) => (
                <SortableScheduleRow key={item.id} {...props} item={item} rowIndex={index} rowCount={props.items.length} />
              ))}
            </tbody>
          </SortableContext>
        </table>
        <datalist id="assignee-options">
          {props.assignees.map((assignee) => <option value={assignee} key={assignee} />)}
        </datalist>
      </div>
    </DndContext>
  );
}
