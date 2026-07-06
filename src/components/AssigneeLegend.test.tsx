import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignee, ScheduleItem } from "../types";
import { AssigneeLegend } from "./AssigneeLegend";

const assignee = (name: string): Assignee => ({
  id: name,
  name,
  color: "#00B050",
  position: 1,
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
});

const item = (patch: Partial<ScheduleItem> = {}): ScheduleItem => ({
  id: "drawing-001",
  position: 1,
  section: "КЗ-0",
  sheetNumber: 1,
  title: "Лист",
  startMode: "manual",
  startDate: "2026-07-06",
  durationDays: 2,
  predecessorIds: [],
  assignee: "Іван",
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
  ...patch,
});

describe("AssigneeLegend", () => {
  it("shows free working days to the selected date for every assignee", async () => {
    const user = userEvent.setup();

    render(
      <AssigneeLegend
        assignees={[assignee("Іван"), assignee("Олена")]}
        visibleAssignees={["Іван", "Олена"]}
        items={[item()]}
        today="2026-07-06"
      />,
    );

    await user.clear(screen.getByLabelText("Дата для розрахунку вільних днів"));
    await user.type(screen.getByLabelText("Дата для розрахунку вільних днів"), "2026-07-10");

    expect(screen.getByText("Іван")).toBeVisible();
    expect(screen.getByText("Вільно: 3 дн.")).toBeVisible();
    expect(screen.getByText("Олена")).toBeVisible();
    expect(screen.getByText("Вільно: 5 дн.")).toBeVisible();
  });
});
