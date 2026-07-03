import type { Assignee } from "../types";

interface AssigneeLegendProps {
  assignees: Assignee[];
  visibleAssignees: string[];
}

export function AssigneeLegend({ assignees, visibleAssignees }: AssigneeLegendProps) {
  const entries = visibleAssignees.length > 0
    ? assignees.filter((person) => visibleAssignees.includes(person.name))
    : assignees.slice(0, 8);
  return (
    <div className="assignee-legend" aria-label="Кольори виконавців">
      {entries.map((person) => (
        <span className="legend-item" key={person.id}>
          <i style={{ backgroundColor: person.color }} />
          {person.name}
        </span>
      ))}
    </div>
  );
}
