import { ASSIGNEE_COLORS } from "../lib/colors";

interface AssigneeLegendProps {
  visibleAssignees: string[];
}

export function AssigneeLegend({ visibleAssignees }: AssigneeLegendProps) {
  const entries = visibleAssignees.length > 0
    ? Object.entries(ASSIGNEE_COLORS).filter(([code]) => visibleAssignees.includes(code))
    : Object.entries(ASSIGNEE_COLORS).slice(0, 8);
  return (
    <div className="assignee-legend" aria-label="Кольори виконавців">
      {entries.map(([code, color]) => (
        <span className="legend-item" key={code}>
          <i style={{ backgroundColor: color }} />
          {code}
        </span>
      ))}
    </div>
  );
}
