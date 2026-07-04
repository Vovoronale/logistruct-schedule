import { describe, expect, it } from "vitest";
import type { Assignee, ScheduleItem } from "../types";
import { applyAssigneeChanges, assigneeUsageCount } from "./assignees";

const person = (name: string, color = "#00B050"): Assignee => ({
  id: "person-1",
  name,
  color,
  position: 1,
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
});

const itemsWith = (name: string): ScheduleItem[] => [{
  id: "drawing-001",
  position: 1,
  section: "КЗ-0",
  sheetNumber: 1,
  title: "Заголовний лист",
  startMode: "manual",
  startDate: null,
  durationDays: null,
  predecessorIds: [],
  assignee: name,
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
}];

describe("assignee directory changes", () => {
  it("renames every matching drawing assignment by stable person id", () => {
    const result = applyAssigneeChanges(
      itemsWith("ІВ"),
      [person("ІВ")],
      [person("Ірина")],
    );
    expect(result.items[0].assignee).toBe("Ірина");
  });

  it("reports usage and blocks removing a used person", () => {
    expect(assigneeUsageCount(itemsWith("ІВ"), "ІВ")).toBe(1);
    expect(() => applyAssigneeChanges(itemsWith("ІВ"), [person("ІВ")], []))
      .toThrow("Спочатку замініть виконавця ІВ");
  });

  it("normalizes positions without mutating input", () => {
    const current = [person("ІВ")];
    const next = [{ ...person("Ірина"), position: 8 }];
    const result = applyAssigneeChanges([], current, next);
    expect(result.assignees[0].position).toBe(1);
    expect(next[0].position).toBe(8);
  });
});
