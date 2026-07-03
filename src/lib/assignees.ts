import type { Assignee, ScheduleItem } from "../types";

export function assigneeUsageCount(items: ScheduleItem[], name: string): number {
  let count = 0;
  for (const item of items) {
    if (item.assignee === name) count += 1;
  }
  return count;
}

export function applyAssigneeChanges(
  items: ScheduleItem[],
  current: Assignee[],
  next: Assignee[],
): { items: ScheduleItem[]; assignees: Assignee[] } {
  const nextById = new Map(next.map((person) => [person.id, person]));
  const renamed = new Map<string, string>();

  for (const person of current) {
    const replacement = nextById.get(person.id);
    if (!replacement && assigneeUsageCount(items, person.name) > 0) {
      throw new Error(`Спочатку замініть виконавця ${person.name} у кресленнях`);
    }
    if (replacement && replacement.name !== person.name) {
      renamed.set(person.name, replacement.name);
    }
  }

  return {
    items: items.map((item) => ({
      ...item,
      assignee: item.assignee ? (renamed.get(item.assignee) ?? item.assignee) : null,
    })),
    assignees: next.map((person, index) => ({ ...person, position: index + 1 })),
  };
}
