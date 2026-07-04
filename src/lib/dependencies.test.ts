import { describe, expect, it } from "vitest";
import type { ScheduleItem } from "../types";
import { addWorkingDays } from "./dates";
import {
  DependencyError,
  dependencyRelations,
  directDependentIds,
  recalculateSchedule,
} from "./dependencies";

const item = (
  id: string,
  position: number,
  patch: Partial<ScheduleItem> = {},
): ScheduleItem => ({
  id,
  position,
  section: "КЗ",
  sheetNumber: position,
  title: id,
  startMode: "manual",
  startDate: "2026-07-06",
  durationDays: 1,
  predecessorIds: [],
  assignee: null,
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
  ...patch,
});

describe("recalculateSchedule", () => {
  it("uses the latest predecessor finish and cascades through successors", () => {
    const result = recalculateSchedule([
      item("a", 1, { durationDays: 2 }),
      item("b", 2, { durationDays: 4 }),
      item("c", 3, {
        startMode: "dependencies",
        startDate: null,
        predecessorIds: ["a", "b"],
      }),
      item("d", 4, {
        startMode: "dependencies",
        startDate: null,
        predecessorIds: ["c"],
      }),
    ]);

    expect(result.find((row) => row.id === "c")?.startDate).toBe("2026-07-10");
    expect(result.find((row) => row.id === "d")?.startDate).toBe("2026-07-13");
  });

  it("does not mutate the submitted rows", () => {
    const rows = [
      item("a", 1),
      item("b", 2, {
        startMode: "dependencies",
        startDate: null,
        predecessorIds: ["a"],
      }),
    ];

    recalculateSchedule(rows);

    expect(rows[1].startDate).toBeNull();
  });

  it.each([
    ["self dependency", [
      item("a", 1, { startMode: "dependencies", predecessorIds: ["a"] }),
    ]],
    ["duplicate edge", [
      item("a", 1),
      item("b", 2, { startMode: "dependencies", predecessorIds: ["a", "a"] }),
    ]],
    ["missing predecessor", [
      item("a", 1, { startMode: "dependencies", predecessorIds: ["missing"] }),
    ]],
    ["manual row with edge", [
      item("a", 1),
      item("b", 2, { predecessorIds: ["a"] }),
    ]],
    ["dependency mode without edges", [
      item("a", 1, { startMode: "dependencies", predecessorIds: [] }),
    ]],
    ["predecessor without finish", [
      item("a", 1, { durationDays: null }),
      item("b", 2, { startMode: "dependencies", predecessorIds: ["a"] }),
    ]],
  ])("rejects %s", (_name, rows) => {
    expect(() => recalculateSchedule(rows)).toThrow(DependencyError);
  });

  it("rejects indirect cycles", () => {
    expect(() => recalculateSchedule([
      item("a", 1, { startMode: "dependencies", predecessorIds: ["c"] }),
      item("b", 2, { startMode: "dependencies", predecessorIds: ["a"] }),
      item("c", 3, { startMode: "dependencies", predecessorIds: ["b"] }),
    ])).toThrow("Виявлено цикл залежностей");
  });

  it("respects a Friday-to-Monday working-day boundary", () => {
    const result = recalculateSchedule([
      item("a", 1, { startDate: "2026-07-09", durationDays: 1 }),
      item("b", 2, { startMode: "dependencies", predecessorIds: ["a"] }),
    ]);

    expect(result[1].startDate).toBe("2026-07-10");
    expect(addWorkingDays(result[1].startDate, 1)).toBe("2026-07-13");
  });

  it("pushes dependencies past configured holidays", () => {
    const result = recalculateSchedule([
      item("a", 1, { startDate: "2026-07-06", durationDays: 1 }),
      item("b", 2, { startMode: "dependencies", predecessorIds: ["a"] }),
    ], new Set(["2026-07-07"]));
    expect(result[1].startDate).toBe("2026-07-08");
  });
});

describe("dependency traversal", () => {
  const rows = [
    item("a", 1),
    item("b", 2, { startMode: "dependencies", predecessorIds: ["a"] }),
    item("c", 3, { startMode: "dependencies", predecessorIds: ["b"] }),
    item("d", 4),
  ];

  it("collects transitive predecessors and successors", () => {
    expect(dependencyRelations(rows, "b")).toEqual({
      predecessors: new Set(["a"]),
      successors: new Set(["c"]),
    });
    expect(dependencyRelations(rows, "a").successors).toEqual(new Set(["b", "c"]));
  });

  it("lists only direct deletion blockers", () => {
    expect(directDependentIds(rows, "a")).toEqual(["b"]);
    expect(directDependentIds(rows, "d")).toEqual([]);
  });
});
