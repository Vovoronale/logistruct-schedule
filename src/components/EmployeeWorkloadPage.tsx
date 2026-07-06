import type { Assignee, ScheduleItem } from "../types";
import { formatDate, type HolidaySet } from "../lib/dates";
import { buildEmployeeWorkloads } from "../lib/workload";

interface EmployeeWorkloadPageProps {
  items: ScheduleItem[];
  assignees: Assignee[];
  today: string;
  holidays?: HolidaySet;
}

const dayFormatter = new Intl.DateTimeFormat("uk-UA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

function shortDay(value: string): string {
  return dayFormatter.format(new Date(`${value}T00:00:00Z`));
}

export function EmployeeWorkloadPage({
  items,
  assignees,
  today,
  holidays = new Set(),
}: EmployeeWorkloadPageProps) {
  const workload = buildEmployeeWorkloads({ items, assignees, today, holidays });
  const busyRows = workload.rows.filter((row) => row.bars.length > 0);
  const overloadedRows = workload.rows.filter((row) => row.maxConcurrent > 1);
  const activeCount = workload.rows.reduce((sum, row) => sum + row.activeItems.length, 0);
  const timelineIndex = new Map(workload.timelineDays.map((day, index) => [day, index]));

  return (
    <section className="workload-page" aria-label="Завантаженість працівників">
      <div className="workload-heading">
        <div>
          <h2>Завантаженість працівників</h2>
          <p>Хто що робить зараз, де є паралельні задачі і коли люди звільняються.</p>
        </div>
        <dl className="workload-stats">
          <div>
            <dt>Активні роботи</dt>
            <dd>{activeCount}</dd>
          </div>
          <div>
            <dt>Завантажені</dt>
            <dd>{busyRows.length}</dd>
          </div>
          <div>
            <dt>Кілька робіт</dt>
            <dd>{overloadedRows.length}</dd>
          </div>
        </dl>
      </div>

      <div className="workload-board">
        <div className="workload-sidebar workload-header-cell">Працівник</div>
        <div
          className="workload-day-header"
          style={{ gridTemplateColumns: `repeat(${workload.timelineDays.length}, var(--workload-day-width))` }}
        >
          {workload.timelineDays.map((day) => (
            <span key={day} className={day === today ? "today" : ""}>{shortDay(day)}</span>
          ))}
        </div>

        {workload.rows.map((row) => {
          const laneCount = Math.max(1, ...row.bars.map((bar) => bar.lane + 1));
          return (
            <div className="workload-row" key={row.assignee.id}>
              <div className="workload-person">
                <span className="workload-color" style={{ backgroundColor: row.assignee.color }} />
                <div>
                  <strong>{row.assignee.name}</strong>
                  <span>
                    {row.activeItems.length > 0
                      ? `Зараз: ${row.activeItems.map((bar) => `№${bar.item.position}`).join(", ")}`
                      : "Зараз без активних робіт"}
                  </span>
                  <small>
                    {row.releaseDate
                      ? `Звільняється: ${formatDate(row.releaseDate)}`
                      : "Немає запланованих робіт"}
                  </small>
                </div>
              </div>
              <div
                className="workload-timeline"
                style={{
                  gridTemplateColumns: `repeat(${workload.timelineDays.length}, var(--workload-day-width))`,
                  gridTemplateRows: `repeat(${laneCount}, 28px)`,
                }}
              >
                {workload.timelineDays.map((day) => {
                  const load = row.loadByDay.get(day) ?? 0;
                  return (
                    <span
                      aria-hidden="true"
                      className={`workload-load-cell ${day === today ? "today" : ""} ${load > 1 ? "overloaded" : load === 1 ? "busy" : ""}`}
                      key={day}
                      style={{ gridColumn: timelineIndex.get(day)! + 1, gridRow: `1 / ${laneCount + 1}` }}
                    />
                  );
                })}
                {row.bars.map((bar) => {
                  const start = timelineIndex.get(bar.startDate);
                  const end = timelineIndex.get(bar.endDate);
                  if (start === undefined || end === undefined) return null;
                  return (
                    <div
                      className={`workload-bar ${bar.item.status}`}
                      key={bar.item.id}
                      title={`№${bar.item.position}: ${bar.item.title}`}
                      style={{
                        gridColumn: `${start + 1} / ${end + 2}`,
                        gridRow: bar.lane + 1,
                        backgroundColor: row.assignee.color,
                      }}
                    >
                      <span>№{bar.item.position}</span>
                      <small>{bar.item.title}</small>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {workload.unassignedCount > 0 ? (
        <p className="workload-note">Без виконавця: {workload.unassignedCount} робіт.</p>
      ) : null}
    </section>
  );
}
