import { describe, expect, it } from "vitest";
import type { Assignee, ScheduleItem } from "../types";
import { buildEmployeeWorkloads } from "./workload";

const assignee = (name: string, color = "#00B050"): Assignee => ({
  id: name,
  name,
  color,
  position: 1,
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
});

const item = (
  id: string,
  assigneeName: string | null,
  startDate: string,
  durationDays: number,
  patch: Partial<ScheduleItem> = {},
): ScheduleItem => ({
  id,
  position: Number(id.replace(/\D/g, "")) || 1,
  section: "КЗ-0",
  sheetNumber: 1,
  title: `Робота ${id}`,
  startMode: "manual",
  startDate,
  durationDays,
  predecessorIds: [],
  assignee: assigneeName,
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
  ...patch,
});

describe("buildEmployeeWorkloads", () => {
  it("summarizes active work, parallel load and release dates by assignee", () => {
    const result = buildEmployeeWorkloads({
      assignees: [assignee("Іван"), assignee("Олена", "#FFC000")],
      items: [
        item("task-1", "Іван", "2026-07-06", 4, { status: "in_progress" }),
        item("task-2", "Іван", "2026-07-07", 3),
        item("task-3", "Олена", "2026-07-10", 2),
        item("task-4", null, "2026-07-06", 2),
        item("task-5", "Іван", "2026-07-01", 1, { status: "completed" }),
      ],
      today: "2026-07-08",
      holidays: new Set(),
    });

    const ivan = result.rows.find((row) => row.assignee.name === "Іван");
    const olena = result.rows.find((row) => row.assignee.name === "Олена");

    expect(ivan?.activeItems.map((active) => active.item.id)).toEqual(["task-1", "task-2"]);
    expect(ivan?.releaseDate).toBe("2026-07-10");
    expect(ivan?.maxConcurrent).toBe(2);
    expect(ivan?.loadByDay.get("2026-07-08")).toBe(2);
    expect(olena?.activeItems).toEqual([]);
    expect(olena?.releaseDate).toBe("2026-07-14");
    expect(result.unassignedCount).toBe(1);
  });

  it("includes assignees discovered from schedule rows", () => {
    const result = buildEmployeeWorkloads({
      assignees: [],
      items: [item("task-1", "Новий", "2026-07-06", 1)],
      today: "2026-07-06",
      holidays: new Set(),
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].assignee.name).toBe("Новий");
  });
});
