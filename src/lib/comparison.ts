import type {
  ComparableItemField,
  ScheduleComparison,
  ScheduleItem,
} from "../types";

const COMPARABLE_FIELDS: ComparableItemField[] = [
  "position",
  "section",
  "sheetNumber",
  "title",
  "startMode",
  "startDate",
  "durationDays",
  "predecessorIds",
  "assignee",
  "status",
];

const SCHEDULE_FIELDS = new Set<ComparableItemField>([
  "position",
  "startMode",
  "startDate",
  "durationDays",
  "predecessorIds",
]);

function fieldIsEqual(
  field: ComparableItemField,
  current: ScheduleItem,
  previous: ScheduleItem,
): boolean {
  if (field === "predecessorIds") {
    return [...current.predecessorIds].sort().join("\0")
      === [...previous.predecessorIds].sort().join("\0");
  }
  return current[field] === previous[field];
}

export function compareSchedules(
  current: ScheduleItem[],
  previous: ScheduleItem[],
): ScheduleComparison {
  const currentById = new Map(current.map((row) => [row.id, row]));
  const previousById = new Map(previous.map((row) => [row.id, row]));
  const changed = current.flatMap((row) => {
    const previousRow = previousById.get(row.id);
    if (!previousRow) return [];
    const fields = COMPARABLE_FIELDS.filter(
      (field) => !fieldIsEqual(field, row, previousRow),
    );
    return fields.length > 0 ? [{ id: row.id, fields }] : [];
  });

  return {
    addedIds: current
      .filter((row) => !previousById.has(row.id))
      .map((row) => row.id),
    removedItems: previous.filter((row) => !currentById.has(row.id)),
    changed,
    rescheduledIds: changed
      .filter((entry) => entry.fields.some((field) => SCHEDULE_FIELDS.has(field)))
      .map((entry) => entry.id),
  };
}
