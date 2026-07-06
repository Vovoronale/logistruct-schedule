import type { ScheduleItem } from "../types";
import { addWorkingDays, effectiveStartDate, todayIso, type HolidaySet } from "./dates";

export class DependencyError extends Error {
  constructor(
    message: string,
    readonly itemId: string,
  ) {
    super(message);
    this.name = "DependencyError";
  }
}

export function recalculateSchedule(
  items: ScheduleItem[],
  holidays: HolidaySet = new Set(),
  today = todayIso(),
): ScheduleItem[] {
  const rows = new Map(
    items.map((row) => [
      row.id,
      { ...row, predecessorIds: [...row.predecessorIds] },
    ]),
  );
  const state = new Map<string, "visiting" | "done">();

  const visit = (id: string): ScheduleItem => {
    const row = rows.get(id);
    if (!row) {
      throw new DependencyError("Не знайдено пов’язану роботу", id);
    }
    if (state.get(id) === "visiting") {
      throw new DependencyError("Виявлено цикл залежностей", id);
    }
    if (state.get(id) === "done") return row;

    state.set(id, "visiting");
    const uniquePredecessors = new Set(row.predecessorIds);
    if (uniquePredecessors.size !== row.predecessorIds.length) {
      throw new DependencyError("Залежності не можуть повторюватися", id);
    }
    if (row.startMode === "manual") {
      if (row.predecessorIds.length > 0) {
        throw new DependencyError("Ручна дата не може містити залежності", id);
      }
    } else {
      if (row.predecessorIds.length === 0) {
        throw new DependencyError("Оберіть хоча б одну попередню роботу", id);
      }
      const finishes = row.predecessorIds.map((predecessorId) => {
        if (predecessorId === id) {
          throw new DependencyError("Робота не може залежати від себе", id);
        }
        if (!rows.has(predecessorId)) {
          throw new DependencyError("Не знайдено пов’язану роботу", id);
        }
        const predecessor = visit(predecessorId);
        const finish = addWorkingDays(
          effectiveStartDate(predecessor.startDate, today),
          predecessor.durationDays,
          holidays,
        );
        if (!finish) {
          throw new DependencyError(
            "Попередня робота не має дати завершення",
            id,
          );
        }
        return finish;
      });
      row.startDate = finishes.sort().at(-1) ?? null;
    }
    state.set(id, "done");
    return row;
  };

  for (const row of items) visit(row.id);
  return items.map((row) => rows.get(row.id)!);
}

export function directDependentIds(
  items: ScheduleItem[],
  targetId: string,
): string[] {
  return items
    .filter((row) => row.predecessorIds.includes(targetId))
    .map((row) => row.id);
}

export interface DependencyRelations {
  predecessors: Set<string>;
  successors: Set<string>;
}

export function dependencyRelations(
  items: ScheduleItem[],
  selectedId: string,
): DependencyRelations {
  const byId = new Map(items.map((row) => [row.id, row]));
  const successorsById = new Map<string, string[]>();
  for (const row of items) {
    for (const predecessorId of row.predecessorIds) {
      successorsById.set(predecessorId, [
        ...(successorsById.get(predecessorId) ?? []),
        row.id,
      ]);
    }
  }

  const collect = (
    seed: string[],
    next: (id: string) => string[],
  ): Set<string> => {
    const found = new Set<string>();
    const queue = [...seed];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (found.has(id)) continue;
      found.add(id);
      queue.push(...next(id));
    }
    found.delete(selectedId);
    return found;
  };

  return {
    predecessors: collect(
      byId.get(selectedId)?.predecessorIds ?? [],
      (id) => byId.get(id)?.predecessorIds ?? [],
    ),
    successors: collect(
      successorsById.get(selectedId) ?? [],
      (id) => successorsById.get(id) ?? [],
    ),
  };
}
