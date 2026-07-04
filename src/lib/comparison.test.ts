import { describe, expect, it } from "vitest";
import type { ScheduleItem } from "../types";
import { compareSchedules } from "./comparison";

const row = (
  id: string,
  patch: Partial<ScheduleItem> = {},
): ScheduleItem => ({
  id,
  position: 1,
  section: "КЗ",
  sheetNumber: 1,
  title: id,
  startMode: "manual",
  startDate: "2026-07-06",
  durationDays: 2,
  predecessorIds: [],
  assignee: null,
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
  ...patch,
});

describe("compareSchedules", () => {
  it("matches by stable id and classifies additions, removals and rescheduling", () => {
    const previous = [row("removed"), row("kept", { position: 1 })];
    const current = [
      row("kept", { position: 2, startDate: "2026-07-08" }),
      row("added"),
    ];

    expect(compareSchedules(current, previous)).toMatchObject({
      addedIds: ["added"],
      removedItems: [{ id: "removed" }],
      changed: [{ id: "kept", fields: ["position", "startDate"] }],
      rescheduledIds: ["kept"],
    });
  });

  it("treats predecessor order as insignificant", () => {
    const previous = [row("x", { predecessorIds: ["a", "b"] })];
    const current = [row("x", { predecessorIds: ["b", "a"] })];

    expect(compareSchedules(current, previous).changed).toEqual([]);
  });

  it("reports a title-only edit without classifying it as rescheduling", () => {
    const result = compareSchedules(
      [row("x", { title: "Нова назва" })],
      [row("x", { title: "Стара назва" })],
    );

    expect(result.changed).toEqual([{ id: "x", fields: ["title"] }]);
    expect(result.rescheduledIds).toEqual([]);
  });

  it("ignores service timestamps", () => {
    const result = compareSchedules(
      [row("x", { updatedAt: "2026-07-04T00:00:00Z" })],
      [row("x", { updatedAt: "2026-07-03T00:00:00Z" })],
    );

    expect(result.changed).toEqual([]);
  });
});
