import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScheduleItem } from "../types";
import { todayIso } from "../lib/dates";
import { ScheduleGrid } from "./ScheduleGrid";

const item: ScheduleItem = {
  id: "drawing-001",
  position: 1,
  section: "КЗ-0",
  sheetNumber: 1,
  title: "Заголовний лист",
  startMode: "manual",
  startDate: "2026-07-03",
  durationDays: 1,
  predecessorIds: [],
  assignee: null,
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
};

afterEach(() => vi.restoreAllMocks());

describe("ScheduleGrid calendar columns", () => {
  it("defines one fixed-width column for every timeline day", () => {
    const { container } = render(
      <ScheduleGrid
        items={[item]}
        timelineDays={["2026-07-03", "2026-07-04", "2026-07-05"]}
        editing={false}
        assignees={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onMoveBy={vi.fn()}
      />,
    );

    expect(container.querySelectorAll("col.timeline-day-column")).toHaveLength(3);
  });

  it("centers the today column on initial render", () => {
    vi.spyOn(HTMLElement.prototype, "offsetLeft", "get")
      .mockImplementation(function offsetLeft(this: HTMLElement) {
        return this.dataset.today === "true" ? 500 : 0;
      });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockImplementation(function clientWidth(this: HTMLElement) {
        return this.classList.contains("schedule-scroller") ? 200 : 24;
      });
    const { container } = render(
      <ScheduleGrid
        items={[item]}
        timelineDays={[todayIso()]}
        editing={false}
        assignees={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onMoveBy={vi.fn()}
      />,
    );

    expect(container.querySelector<HTMLElement>(".schedule-scroller")?.scrollLeft)
      .toBe(412);
  });

  it("marks selected, predecessor, successor and unrelated rows", async () => {
    const user = userEvent.setup();
    const onToggleAnalysis = vi.fn();
    const items = [
      { ...item, id: "a", position: 1 },
      {
        ...item,
        id: "b",
        position: 2,
        startMode: "dependencies" as const,
        predecessorIds: ["a"],
      },
      {
        ...item,
        id: "c",
        position: 3,
        startMode: "dependencies" as const,
        predecessorIds: ["b"],
      },
      { ...item, id: "d", position: 4 },
    ];
    render(
      <ScheduleGrid
        items={items}
        allItems={items}
        timelineDays={[]}
        editing={false}
        assignees={[]}
        selectedAnalysisId="b"
        predecessorIds={new Set(["a"])}
        successorIds={new Set(["c"])}
        onToggleAnalysis={onToggleAnalysis}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onMoveBy={vi.fn()}
      />,
    );

    expect(screen.getByTestId("schedule-row-a")).toHaveClass("dependency-predecessor");
    expect(screen.getByTestId("schedule-row-b")).toHaveClass("dependency-selected");
    expect(screen.getByTestId("schedule-row-c")).toHaveClass("dependency-successor");
    expect(screen.getByTestId("schedule-row-d")).toHaveClass("dependency-unrelated");
    await user.click(screen.getByRole("button", {
      name: "Показати залежності для роботи №2",
    }));
    expect(onToggleAnalysis).toHaveBeenCalledWith("b");
  });
});
