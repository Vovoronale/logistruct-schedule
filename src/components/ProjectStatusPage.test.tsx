import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ScheduleItem } from "../types";
import { buildProjectStatus } from "../lib/project-status";
import { ProjectStatusPage } from "./ProjectStatusPage";

function item(
  id: string,
  section: string,
  status: ScheduleItem["status"],
  durationDays = 5,
): ScheduleItem {
  return {
    id,
    position: Number(id),
    section,
    sheetNumber: Number(id),
    title: `Креслення ${id}`,
    startMode: "manual",
    startDate: "2026-07-03",
    durationDays,
    predecessorIds: [],
    assignee: null,
    status,
    createdAt: "2026-07-03T00:00:00Z",
    updatedAt: "2026-07-03T00:00:00Z",
  };
}

describe("buildProjectStatus", () => {
  it("combines КЗ and КБ sections into the public КБ summary", () => {
    const result = buildProjectStatus([
      item("1", "КЗ-0", "completed"),
      item("2", "КБ-1", "in_progress"),
      item("3", "КМ2", "planned", 10),
    ], "2026-07-07");

    expect(result.overall).toMatchObject({ total: 3, completed: 1, inProgress: 1, planned: 1 });
    expect(result.kb).toMatchObject({ total: 2, completed: 1, inProgress: 1, planned: 0 });
    expect(result.km).toMatchObject({ total: 1, completed: 0, inProgress: 0, planned: 1 });
  });
});

describe("ProjectStatusPage", () => {
  it("shows one overall status text followed by separate КБ and КМ summaries", () => {
    render(
      <ProjectStatusPage
        items={[
          item("1", "КЗ-0", "completed"),
          item("2", "КМ2", "in_progress"),
        ]}
        today="2026-07-07"
        updatedAt="2026-07-03T10:15:00Z"
      />,
    );

    expect(screen.getByRole("heading", { name: "Стан виконання проєкту" })).toBeVisible();
    expect(screen.getByTestId("overall-status")).toHaveTextContent("Загальний стан");
    expect(screen.getByTestId("overall-status")).toHaveTextContent("Виконано 1 із 2");
    expect(screen.getByRole("heading", { name: "КБ" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "КМ" })).toBeVisible();
  });
});
