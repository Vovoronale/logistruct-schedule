import { describe, expect, it } from "vitest";
import type { ScheduleItem } from "../types";
import { filterItems, moveItem, normalizePositions } from "./schedule";

const makeItem = (
  id: string,
  section: string,
  title: string,
  status: ScheduleItem["status"] = "planned",
): ScheduleItem => ({
  id,
  position: Number(id),
  section,
  sheetNumber: 1,
  title,
  startMode: "manual",
  startDate: null,
  durationDays: null,
  predecessorIds: [],
  assignee: null,
  status,
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
});

const items = [
  makeItem("1", "КМ2", "Ферма Ф-1"),
  makeItem("2", "КМ2", "Ферма Ф-2", "completed"),
  makeItem("3", "КЗ-0", "План фундаментів"),
];

describe("filterItems", () => {
  it("combines case-insensitive query, section and status filters", () => {
    expect(
      filterItems(items, {
        query: "ферма",
        section: "КМ2",
        assignee: "",
        status: "planned",
      }),
    ).toEqual([items[0]]);
  });
});

describe("schedule ordering", () => {
  it("moves an item and normalizes visible positions", () => {
    const moved = moveItem(items, "3", "1");
    expect(moved.map((item) => item.id)).toEqual(["3", "1", "2"]);
    expect(moved.map((item) => item.position)).toEqual([1, 2, 3]);
  });

  it("normalizes gaps without mutating the source", () => {
    const normalized = normalizePositions(items);
    expect(normalized.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(normalized).not.toBe(items);
  });
});
