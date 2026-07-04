import type {
  ProgressSummary,
  ScheduleProgress,
} from "../lib/progress";

const percentFormatter = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

function sheetWord(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "листів";
  if (last === 1) return "лист";
  if (last >= 2 && last <= 4) return "листи";
  return "листів";
}

function Metrics({ summary }: { summary: ProgressSummary }) {
  return (
    <span>
      {summary.sheetCount} {sheetWord(summary.sheetCount)} · {summary.totalDays}{" "}
      робочих днів
    </span>
  );
}

export function ProgressOverview({
  progress,
}: {
  progress: ScheduleProgress;
}) {
  if (!progress.overall) {
    return (
      <section
        className="progress-overview empty"
        aria-labelledby="progress-heading"
      >
        <div>
          <h2 id="progress-heading">Загальний прогрес</h2>
          <p>Недостатньо даних для розрахунку</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="progress-overview"
      aria-labelledby="progress-heading"
    >
      <div className="overall-progress">
        <div className="progress-heading-row">
          <div>
            <h2 id="progress-heading">Загальний прогрес</h2>
            <Metrics summary={progress.overall} />
          </div>
          <strong>{formatPercent(progress.overall.percentage)}</strong>
        </div>
        <progress
          aria-label="Загальний прогрес"
          max={100}
          value={progress.overall.percentage}
        />
      </div>
      <div className="section-progress-grid" aria-label="Прогрес розділів">
        {progress.sections.map((section) => (
          <article className="section-progress-card" key={section.section}>
            <div className="progress-heading-row">
              <h3>{section.section}</h3>
              <strong>{formatPercent(section.percentage)}</strong>
            </div>
            <progress
              aria-label={`Прогрес розділу ${section.section}`}
              max={100}
              value={section.percentage}
            />
            <Metrics summary={section} />
          </article>
        ))}
      </div>
    </section>
  );
}
