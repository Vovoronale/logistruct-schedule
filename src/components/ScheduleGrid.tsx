import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  Assignee,
  ComparableItemField,
  ItemComparison,
  ScheduleComparison,
  ScheduleItem,
  ScheduleStatus,
} from "../types";
import { addWorkingDays, formatDate, type HolidaySet } from "../lib/dates";
import { calculateItemProgress } from "../lib/progress";
import { getScheduleRowCompleteness, isOverdue, STATUS_LABELS } from "../lib/schedule";
import { ChevronDownIcon, ChevronUpIcon, GripIcon, TrashIcon } from "./Icons";
import { DependencyEditor } from "./DependencyEditor";
import { DependencyArrows } from "./DependencyArrows";
import { GanttCells, GanttDayHeaders, GanttMonthHeaders } from "./GanttTimeline";

interface ScheduleGridProps {
  items: ScheduleItem[];
  allItems?: ScheduleItem[];
  timelineDays: string[];
  today: string;
  holidays?: HolidaySet;
  editing: boolean;
  assignees: Assignee[];
  dependencyError?: { itemId: string; message: string } | null;
  selectedAnalysisId?: string | null;
  predecessorIds?: Set<string>;
  successorIds?: Set<string>;
  onToggleAnalysis?: (id: string) => void;
  comparison?: ScheduleComparison | null;
  previousItems?: ScheduleItem[];
  onUpdate: (id: string, patch: Partial<ScheduleItem>) => void;
  onDelete: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onMoveBy: (id: string, delta: -1 | 1) => void;
}

interface RowProps extends Omit<ScheduleGridProps, "items" | "onReorder"> {
  item: ScheduleItem;
  previousItem?: ScheduleItem;
  comparisonEntry?: ItemComparison;
  isAdded?: boolean;
  rowIndex: number;
  rowCount: number;
  pinnedColumns: Set<PinnableColumnKey>;
}

const progressFormatter = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const pinnableColumns = [
  { key: "startMode", className: "col-start-mode", widthVar: "--c5", label: "Початок за" },
  { key: "startDate", className: "col-start-date", widthVar: "--c6", label: "Початок" },
  { key: "duration", className: "col-duration", widthVar: "--c7", label: "Робочі дні" },
  { key: "endDate", className: "col-end-date", widthVar: "--c8", label: "Завершення" },
  { key: "assignee", className: "col-assignee", widthVar: "--c9", label: "Виконавець" },
  { key: "status", className: "col-status", widthVar: "--c10", label: "Статус" },
  { key: "progress", className: "col-progress", widthVar: "--c11", label: "Виконання" },
] as const;

type PinnableColumnKey = (typeof pinnableColumns)[number]["key"];

const getPinnedColumnLeft = (
  key: PinnableColumnKey,
  pinnedColumns: Set<PinnableColumnKey>,
) => {
  const leftParts = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"];
  for (const column of pinnableColumns) {
    if (column.key === key) break;
    if (pinnedColumns.has(column.key)) leftParts.push(`var(${column.widthVar})`);
  }
  return `calc(${leftParts.join(" + ")})`;
};

const getPinnedColumnStyle = (
  key: PinnableColumnKey,
  pinnedColumns: Set<PinnableColumnKey>,
) => pinnedColumns.has(key)
  ? { left: getPinnedColumnLeft(key, pinnedColumns) } as CSSProperties
  : undefined;

const getPinnableColumnClassName = (
  key: PinnableColumnKey,
  className: string,
  pinnedColumns: Set<PinnableColumnKey>,
  extraClassName = "",
) => [
  pinnedColumns.has(key) ? "sticky-col" : "",
  className,
  extraClassName,
].filter(Boolean).join(" ");

const formatProgress = (value: number) =>
  `${progressFormatter.format(value)}%`;

function SortableScheduleRow({ item, previousItem, comparisonEntry, isAdded, rowIndex, rowCount, timelineDays, today, holidays = new Set(), editing, assignees, allItems, dependencyError, selectedAnalysisId, predecessorIds, successorIds, pinnedColumns, onToggleAnalysis, onUpdate, onDelete, onMoveBy }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !editing });
  const style = { transform: CSS.Transform.toString(transform), transition } as CSSProperties;
  const endDate = addWorkingDays(item.startDate, item.durationDays, holidays);
  const overdue = isOverdue(item, today, holidays);
  const progress = calculateItemProgress(item, today, holidays);
  const relationClass = item.id === selectedAnalysisId
    ? "dependency-selected"
    : predecessorIds?.has(item.id)
      ? "dependency-predecessor"
      : successorIds?.has(item.id)
        ? "dependency-successor"
        : selectedAnalysisId
          ? "dependency-unrelated"
          : "";
  const itemById = new Map((allItems ?? []).map((candidate) => [candidate.id, candidate]));
  const changedFields = new Set(comparisonEntry?.fields ?? []);
  const cellProps = (
    field: ComparableItemField,
    previousValue: string,
  ) => changedFields.has(field)
    ? { className: "changed-cell", title: `Було: ${previousValue}` }
    : {};
  const pinnableCellProps = (
    key: PinnableColumnKey,
    className: string,
    field: ComparableItemField,
    previousValue: string,
  ) => {
    const props = cellProps(field, previousValue);
    return {
      ...props,
      className: getPinnableColumnClassName(key, className, pinnedColumns, props.className),
      style: getPinnedColumnStyle(key, pinnedColumns),
    };
  };
  const previousPredecessors = previousItem?.predecessorIds
    .map((id) => itemById.get(id)?.position)
    .filter((position): position is number => position !== undefined)
    .map((position) => `№${position}`)
    .join(", ") || "—";
  const scheduleChanged = changedFields.has("startDate")
    || changedFields.has("durationDays");
  const completeness = getScheduleRowCompleteness(item);
  const completenessClass = completeness === "complete" ? "" : `row-${completeness}`;

  return (
    <tr ref={setNodeRef} style={style} data-testid={`schedule-row-${item.id}`} className={`${item.status === "completed" ? "completed-row" : ""} ${overdue ? "overdue-row" : ""} ${isDragging ? "dragging" : ""} ${relationClass} ${isAdded ? "comparison-added" : ""} ${completenessClass}`}>
      <td className={`sticky-col col-number row-number ${changedFields.has("position") ? "changed-cell" : ""}`} title={changedFields.has("position") ? `Було: ${previousItem?.position ?? "—"}` : undefined}>
        {editing ? (
          <button className="drag-handle" type="button" aria-label={`Перемістити рядок ${item.position}`} {...attributes} {...listeners}><GripIcon /></button>
        ) : null}
        <span>{item.position}</span>
      </td>
      <td className={`sticky-col col-section ${changedFields.has("section") ? "changed-cell" : ""}`} title={changedFields.has("section") ? `Було: ${previousItem?.section ?? "—"}` : undefined}>
        {editing ? <input className="cell-input compact" value={item.section} onChange={(e) => onUpdate(item.id, { section: e.target.value })} aria-label={`Розділ рядка ${item.position}`} /> : <span className={`section-badge ${item.section.startsWith("КМ") ? "metal" : "concrete"}`}>{item.section}</span>}
      </td>
      <td className={`sticky-col col-sheet ${changedFields.has("sheetNumber") ? "changed-cell" : ""}`} title={changedFields.has("sheetNumber") ? `Було: ${previousItem?.sheetNumber ?? "—"}` : undefined}>
        {editing ? <input className="cell-input numeric" type="number" min="1" value={item.sheetNumber} onChange={(e) => onUpdate(item.id, { sheetNumber: Number(e.target.value) })} aria-label={`Номер листа рядка ${item.position}`} /> : item.sheetNumber}
      </td>
      <td className={`sticky-col col-title ${changedFields.has("title") ? "changed-cell" : ""}`} title={changedFields.has("title") ? `Було: ${previousItem?.title ?? "—"}` : undefined}>
        <div className="title-cell">
          {editing ? <textarea className="cell-input title-input" value={item.title} onChange={(e) => onUpdate(item.id, { title: e.target.value })} aria-label={`Назва креслення рядка ${item.position}`} /> : <span>{item.title}</span>}
          <button type="button" className="analysis-button" onClick={() => onToggleAnalysis?.(item.id)} aria-label={`Показати залежності для роботи №${item.position}`}>↔</button>
          {editing ? <button type="button" className="delete-row" onClick={() => onDelete(item.id)} aria-label={`Видалити рядок ${item.position}`}><TrashIcon /></button> : null}
        </div>
      </td>
      <td
        className={getPinnableColumnClassName("startMode", "col-start-mode dependency-cell", pinnedColumns, changedFields.has("startMode") || changedFields.has("predecessorIds") ? "changed-cell" : "")}
        style={getPinnedColumnStyle("startMode", pinnedColumns)}
        title={changedFields.has("startMode") || changedFields.has("predecessorIds") ? `Було: ${previousItem?.startMode === "manual" ? "Датою" : previousPredecessors}` : undefined}
      >
        {editing ? (
          <DependencyEditor
            item={item}
            items={allItems ?? []}
            error={dependencyError?.itemId === item.id ? dependencyError.message : undefined}
            onChange={(patch) => onUpdate(item.id, patch)}
          />
        ) : item.startMode === "manual" ? (
          <span className="start-mode-label">Датою</span>
        ) : (
          <span className="dependency-summary">
            {item.predecessorIds.map((id) => {
              const predecessor = itemById.get(id);
              return predecessor ? <span className="dependency-chip" key={id}>№{predecessor.position}</span> : null;
            })}
          </span>
        )}
      </td>
      <td {...pinnableCellProps("startDate", "col-start-date", "startDate", formatDate(previousItem?.startDate ?? null))}>{editing ? <input className="cell-input date" type="date" readOnly={item.startMode === "dependencies"} value={item.startDate ?? ""} onChange={(e) => onUpdate(item.id, { startDate: e.target.value || null })} aria-label={`Дата початку рядка ${item.position}`} /> : formatDate(item.startDate)}</td>
      <td className={getPinnableColumnClassName("duration", "col-duration duration-cell", pinnedColumns, changedFields.has("durationDays") ? "changed-cell" : "")} style={getPinnedColumnStyle("duration", pinnedColumns)} title={changedFields.has("durationDays") ? `Було: ${previousItem?.durationDays ?? "—"}` : undefined}>{editing ? <input className="cell-input numeric" type="number" min="1" value={item.durationDays ?? ""} onChange={(e) => onUpdate(item.id, { durationDays: e.target.value ? Number(e.target.value) : null })} aria-label={`Робочі дні рядка ${item.position}`} /> : (item.durationDays ?? "—")}</td>
      <td className={getPinnableColumnClassName("endDate", "col-end-date", pinnedColumns, scheduleChanged ? "changed-cell" : "")} style={getPinnedColumnStyle("endDate", pinnedColumns)} title={scheduleChanged ? `Було: ${formatDate(addWorkingDays(previousItem?.startDate ?? null, previousItem?.durationDays ?? null, holidays))}` : undefined}>{formatDate(endDate)}</td>
      <td {...pinnableCellProps("assignee", "col-assignee", "assignee", previousItem?.assignee ?? "—")}>{editing ? <input className="cell-input compact" list="assignee-options" value={item.assignee ?? ""} onChange={(e) => onUpdate(item.id, { assignee: e.target.value || null })} aria-label={`Виконавець рядка ${item.position}`} /> : <span className="assignee-code">{item.assignee ?? "—"}</span>}</td>
      <td {...pinnableCellProps("status", "col-status", "status", previousItem?.status ?? "—")}>
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
      <td className={getPinnableColumnClassName("progress", "col-progress sheet-progress-cell", pinnedColumns)} style={getPinnedColumnStyle("progress", pinnedColumns)}>
        {progress === null ? (
          <span className="progress-unavailable">—</span>
        ) : (
          <div
            className="sheet-progress"
            title={`Виконання: ${formatProgress(progress)}`}
          >
            <progress
              aria-label={`Виконання листа ${item.position}`}
              max={100}
              value={progress}
            />
            <span>{formatProgress(progress)}</span>
          </div>
        )}
      </td>
      {timelineDays.length > 0 ? <GanttCells item={item} previousItem={previousItem} days={timelineDays} assignees={assignees} today={today} holidays={holidays} /> : (
        <td className="empty-timeline-cell">{rowIndex === 0 ? <span>Дати ще не заплановані</span> : null}</td>
      )}
    </tr>
  );
}

function RemovedScheduleRow({
  item,
  items,
  timelineDays,
  assignees,
  today,
  holidays,
  pinnedColumns,
}: {
  item: ScheduleItem;
  items: ScheduleItem[];
  timelineDays: string[];
  assignees: Assignee[];
  today: string;
  holidays?: HolidaySet;
  pinnedColumns: Set<PinnableColumnKey>;
}) {
  const positions = new Map(items.map((candidate) => [candidate.id, candidate.position]));
  return (
    <tr data-testid={`removed-row-${item.id}`}>
      <td className="sticky-col col-number row-number">{item.position}</td>
      <td className="sticky-col col-section">{item.section}</td>
      <td className="sticky-col col-sheet">{item.sheetNumber}</td>
      <td className="sticky-col col-title">{item.title}</td>
      <td className={getPinnableColumnClassName("startMode", "col-start-mode", pinnedColumns)} style={getPinnedColumnStyle("startMode", pinnedColumns)}>{item.startMode === "manual" ? "Датою" : item.predecessorIds.map((id) => `№${positions.get(id) ?? "?"}`).join(", ")}</td>
      <td className={getPinnableColumnClassName("startDate", "col-start-date", pinnedColumns)} style={getPinnedColumnStyle("startDate", pinnedColumns)}>{formatDate(item.startDate)}</td>
      <td className={getPinnableColumnClassName("duration", "col-duration", pinnedColumns)} style={getPinnedColumnStyle("duration", pinnedColumns)}>{item.durationDays ?? "—"}</td>
      <td className={getPinnableColumnClassName("endDate", "col-end-date", pinnedColumns)} style={getPinnedColumnStyle("endDate", pinnedColumns)}>{formatDate(addWorkingDays(item.startDate, item.durationDays, holidays))}</td>
      <td className={getPinnableColumnClassName("assignee", "col-assignee", pinnedColumns)} style={getPinnedColumnStyle("assignee", pinnedColumns)}>{item.assignee ?? "—"}</td>
      <td className={getPinnableColumnClassName("status", "col-status", pinnedColumns)} style={getPinnedColumnStyle("status", pinnedColumns)}><span className="status-badge removed">Видалено</span></td>
      <td className={getPinnableColumnClassName("progress", "col-progress sheet-progress-cell", pinnedColumns)} style={getPinnedColumnStyle("progress", pinnedColumns)}><span className="progress-unavailable">—</span></td>
      {timelineDays.length > 0
        ? <GanttCells item={item} days={timelineDays} assignees={assignees} today={today} holidays={holidays} />
        : <td className="empty-timeline-cell" />}
    </tr>
  );
}

export function ScheduleGrid(props: ScheduleGridProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const centeredToday = useRef(false);
  const [pinnedColumns, setPinnedColumns] = useState<Set<PinnableColumnKey>>(() => new Set());
  const timelineKey = props.timelineDays.join("|");
  const visibleItemsKey = props.items.map((item) => item.id).sort().join("|");
  const previousById = new Map(
    (props.previousItems ?? []).map((item) => [item.id, item]),
  );
  const comparisonById = new Map(
    (props.comparison?.changed ?? []).map((entry) => [entry.id, entry]),
  );
  const addedIds = new Set(props.comparison?.addedIds ?? []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) props.onReorder(String(active.id), String(over.id));
  };
  const togglePinnedColumn = (key: PinnableColumnKey) => {
    setPinnedColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const renderPinnableHeader = (
    key: PinnableColumnKey,
    className: string,
    label: string,
  ) => {
    const checked = pinnedColumns.has(key);
    return (
      <th
        key={key}
        rowSpan={2}
        className={getPinnableColumnClassName(key, className, pinnedColumns)}
        style={getPinnedColumnStyle(key, pinnedColumns)}
        aria-label={label}
      >
        <div className="pinnable-header">
          <span>{label}</span>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => togglePinnedColumn(key)}
            aria-label={`Закріпити колонку ${label}`}
            title={checked ? "Відкріпити колонку" : "Закріпити колонку"}
          />
        </div>
      </th>
    );
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || centeredToday.current || !timelineKey) return;
    const todayCell = scroller.querySelector<HTMLElement>('[data-today="true"]');
    if (!todayCell) return;
    scroller.scrollLeft = Math.max(
      0,
      todayCell.offsetLeft - scroller.clientWidth / 2 + todayCell.clientWidth / 2,
    );
    centeredToday.current = true;
  }, [timelineKey]);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
  }, [visibleItemsKey]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div ref={scrollerRef} className={`schedule-scroller ${props.editing ? "is-editing" : ""}`}>
        <div ref={canvasRef} className="schedule-canvas">
          <table className="schedule-table">
          {props.timelineDays.length > 0 ? (
            <colgroup>
              {Array.from({ length: 11 }, (_, index) => <col key={`schedule-column-${index}`} />)}
              {props.timelineDays.map((day) => <col className="timeline-day-column" key={day} />)}
            </colgroup>
          ) : null}
          <thead>
            <tr>
              <th rowSpan={2} className="sticky-col col-number">№</th>
              <th rowSpan={2} className="sticky-col col-section">Розділ</th>
              <th rowSpan={2} className="sticky-col col-sheet">№ листа</th>
              <th rowSpan={2} className="sticky-col col-title">Найменування креслення</th>
              {pinnableColumns.map((column) => renderPinnableHeader(column.key, column.className, column.label))}
              {props.timelineDays.length > 0 ? <GanttMonthHeaders days={props.timelineDays} /> : <th rowSpan={2} className="empty-timeline-header">Календар робіт</th>}
            </tr>
            {props.timelineDays.length > 0 ? <tr><GanttDayHeaders days={props.timelineDays} today={props.today} holidays={props.holidays} /></tr> : null}
          </thead>
          <SortableContext items={props.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {props.items.map((item, index) => (
                <SortableScheduleRow key={item.id} {...props} allItems={props.allItems ?? props.items} item={item} previousItem={previousById.get(item.id)} comparisonEntry={comparisonById.get(item.id)} isAdded={addedIds.has(item.id)} rowIndex={index} rowCount={props.items.length} pinnedColumns={pinnedColumns} />
              ))}
            </tbody>
          </SortableContext>
          {props.comparison?.removedItems.length ? (
            <tbody className="removed-items">
              {props.comparison.removedItems.map((item) => (
                <RemovedScheduleRow
                  key={item.id}
                  item={item}
                  items={props.previousItems ?? props.comparison!.removedItems}
                  timelineDays={props.timelineDays}
                  assignees={props.assignees}
                  today={props.today}
                  holidays={props.holidays}
                  pinnedColumns={pinnedColumns}
                />
              ))}
            </tbody>
          ) : null}
          </table>
          <DependencyArrows
            containerRef={canvasRef}
            items={props.allItems ?? props.items}
            selectedId={props.selectedAnalysisId}
            predecessorIds={props.predecessorIds}
            successorIds={props.successorIds}
          />
          <datalist id="assignee-options">
            {props.assignees.map((assignee) => <option value={assignee.name} key={assignee.id} />)}
          </datalist>
        </div>
      </div>
    </DndContext>
  );
}
