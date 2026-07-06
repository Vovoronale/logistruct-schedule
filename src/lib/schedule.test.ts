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

  it("matches the general query against every visible schedule column", () => {
    const searchable = {
      ...makeItem("7", "КМ5", "Монтажна схема", "in_progress"),
      position: 7,
      sheetNumber: 42,
      startDate: "2026-07-03",
      durationDays: 3,
      assignee: "Олена",
    };
    const other = {
      ...makeItem("8", "КЗ-1", "План фундаментів"),
      position: 8,
      sheetNumber: 11,
      startDate: "2026-07-09",
      durationDays: 1,
      assignee: "Іван",
    };

    const query = (value: string) =>
      filterItems([searchable, other], {
        query: value,
        section: "",
        assignee: "",
        status: "",
      }, {
        today: "2026-07-06",
      });

    expect(query("№7")).toEqual([searchable]);
    expect(query("42")).toEqual([searchable]);
    expect(query("Датою")).toEqual([searchable, other]);
    expect(query("03.07.2026")).toEqual([searchable]);
    expect(query("08.07.2026")).toEqual([searchable]);
    expect(query("3")).toEqual([searchable]);
    expect(query("Олена")).toEqual([searchable]);
    expect(query("У роботі")).toEqual([searchable]);
    expect(query("33,3%")).toEqual([searchable]);
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
