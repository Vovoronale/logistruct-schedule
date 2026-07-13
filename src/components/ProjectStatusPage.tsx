import type { ScheduleItem } from "../types";
import type { HolidaySet } from "../lib/dates";
import { buildProjectStatus, type StatusSummary } from "../lib/project-status";

const percentFormatter = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function percentageText(percentage: number | null): string {
  return percentage === null ? "ще не розраховано" : `${percentFormatter.format(percentage)}%`;
}

function statusText(label: string, summary: StatusSummary): string {
  if (summary.total === 0) return `${label}: даних для розрахунку поки немає.`;
  return `${label} — ${percentageText(summary.percentage)}.`;
}

function statusDateText(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  const formatted = new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date).replace(/\s*р\.$/u, "");
  return `Станом на ${formatted} року`;
}

function updatedText(value?: string): string {
  if (!value) return "Дані оновлюються";
  return `Оновлено ${new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))}`;
}

interface ProjectStatusPageProps {
  items: ScheduleItem[];
  today: string;
  holidays?: HolidaySet;
  updatedAt?: string;
}

export function ProjectStatusPage({
  items,
  today,
  holidays = new Set(),
  updatedAt,
}: ProjectStatusPageProps) {
  const status = buildProjectStatus(items, today, holidays);

  return (
    <main className="project-status-page">
      <div className="status-sheet">
        <header className="status-header">
          <div className="status-brand" aria-label="LogiStruct">L</div>
          <div>
            <span className="status-company">LogiStruct · Аквапарк «Став»</span>
            <h1>Стан виконання проєкту</h1>
            <p className="status-date">{statusDateText(today)}</p>
          </div>
        </header>

        <section className="overall-status-block" aria-labelledby="overall-status-heading">
          <span id="overall-status-heading">Загальна картина</span>
          <p data-testid="overall-status">{statusText("Загальний стан", status.overall)}</p>
        </section>

        <div className="discipline-statuses" aria-label="Стан за розділами">
          <section className="discipline-status kb-status" aria-labelledby="kb-status-heading">
            <div className="discipline-heading">
              <h2 id="kb-status-heading">КБ</h2>
              <strong>{percentageText(status.kb.percentage)}</strong>
            </div>
            <p>{statusText("Стан розділу КБ", status.kb)}</p>
          </section>
          <section className="discipline-status km-status" aria-labelledby="km-status-heading">
            <div className="discipline-heading">
              <h2 id="km-status-heading">КМ</h2>
              <strong>{percentageText(status.km.percentage)}</strong>
            </div>
            <p>{statusText("Стан розділу КМ", status.km)}</p>
          </section>
        </div>

        <footer className="status-footer">
          <span>{updatedText(updatedAt)}</span>
          <span>Стан формується автоматично з робочого графіка</span>
        </footer>
      </div>
    </main>
  );
}
