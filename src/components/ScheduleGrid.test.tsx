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
        today="2026-07-04"
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

  it("starts schedule metadata columns unpinned and toggles pinning from header checkboxes", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ScheduleGrid
        items={[item]}
        timelineDays={["2026-07-03"]}
        today="2026-07-03"
        editing={false}
        assignees={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onMoveBy={vi.fn()}
      />,
    );

    const pinStartDate = screen.getByRole("checkbox", {
      name: "Закріпити колонку Початок",
    });
    const pinStatus = screen.getByRole("checkbox", {
      name: "Закріпити колонку Статус",
    });
    expect(pinStartDate).not.toBeChecked();
    expect(pinStatus).not.toBeChecked();

    const rowCells = () => container.querySelectorAll<HTMLTableCellElement>(
      '[data-testid="schedule-row-drawing-001"] > td',
    );
    for (const cell of Array.from(rowCells()).slice(4, 11)) {
      expect(cell).not.toHaveClass("sticky-col");
    }

    await user.click(pinStartDate);

    expect(pinStartDate).toBeChecked();
    expect(pinStartDate.closest("th")).toHaveClass("sticky-col");
    expect(rowCells()[5]).toHaveClass("sticky-col");
    expect(rowCells()[5]).toHaveStyle({
      left: "calc(var(--c1) + var(--c2) + var(--c3) + var(--c4))",
    });
    expect(rowCells()[9]).not.toHaveClass("sticky-col");

    await user.click(pinStartDate);

    expect(pinStartDate).not.toBeChecked();
    expect(rowCells()[5]).not.toHaveClass("sticky-col");
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
        today={todayIso()}
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

  it("returns to the first visible row when filtering changes the item set", () => {
    const secondItem = { ...item, id: "drawing-002", position: 2 };
    const props = {
      timelineDays: [] as string[],
      today: "2026-07-04",
      editing: false,
      assignees: [],
      onUpdate: vi.fn(),
      onDelete: vi.fn(),
      onReorder: vi.fn(),
      onMoveBy: vi.fn(),
    };
    const { container, rerender } = render(
      <ScheduleGrid items={[item, secondItem]} {...props} />,
    );
    const scroller = container.querySelector<HTMLElement>(".schedule-scroller")!;
    scroller.scrollTop = 240;

    rerender(<ScheduleGrid items={[secondItem]} allItems={[item, secondItem]} {...props} />);

    expect(scroller.scrollTop).toBe(0);
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
        today="2026-07-04"
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

  it("marks partially filled and empty sheet rows for muted styling", () => {
    const fullItem = { ...item, id: "full", position: 1, assignee: "Олена" };
    const partialItem = {
      ...item,
      id: "partial",
      position: 2,
      startDate: null,
      durationDays: null,
      assignee: null,
    };
    const emptyItem = {
      ...item,
      id: "empty",
      position: 3,
      section: "",
      sheetNumber: 0,
      title: "",
      startDate: null,
      durationDays: null,
      assignee: null,
      predecessorIds: [],
    };

    render(
      <ScheduleGrid
        items={[fullItem, partialItem, emptyItem]}
        timelineDays={[]}
        today="2026-07-04"
        editing={false}
        assignees={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onMoveBy={vi.fn()}
      />,
    );

    expect(screen.getByTestId("schedule-row-full")).not.toHaveClass("row-partial");
    expect(screen.getByTestId("schedule-row-full")).not.toHaveClass("row-empty");
    expect(screen.getByTestId("schedule-row-partial")).toHaveClass("row-partial");
    expect(screen.getByTestId("schedule-row-partial")).not.toHaveClass("row-empty");
    expect(screen.getByTestId("schedule-row-empty")).toHaveClass("row-empty");
  });

  it("renders dependency routes over the gantt and keeps hidden links unfinished", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function getBoundingClientRect(this: HTMLElement) {
        if (this.classList.contains("schedule-canvas")) {
          return { left: 0, right: 500, top: 0, bottom: 300, width: 500, height: 300 } as DOMRect;
        }
        const id = this.dataset.ganttItem;
        const row = id === "b" ? 120 : 180;
        return { left: 300, right: 332, top: row, bottom: row + 20, width: 32, height: 20 } as DOMRect;
      });
    const allItems = [
      { ...item, id: "a", position: 1 },
      { ...item, id: "b", position: 2, startMode: "dependencies" as const, predecessorIds: ["a"] },
      { ...item, id: "c", position: 3, startMode: "dependencies" as const, predecessorIds: ["b"] },
    ];

    const { container } = render(
      <ScheduleGrid
        items={allItems.slice(1)}
        allItems={allItems}
        timelineDays={["2026-07-03"]}
        today="2026-07-03"
        editing={false}
        assignees={[]}
        selectedAnalysisId="b"
        predecessorIds={new Set(["a"])}
        successorIds={new Set(["c"])}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onMoveBy={vi.fn()}
      />,
    );

    const overlay = await screen.findByTestId("dependency-arrow-overlay");
    expect(container.querySelector(".schedule-canvas")?.contains(overlay)).toBe(true);
    expect(overlay.querySelectorAll('path[data-arrow-kind="complete"]')).toHaveLength(1);
    expect(overlay.querySelector('path[data-arrow-kind="hidden-predecessor"]'))
      .toBeInTheDocument();
    expect(screen.getByText("…")).toBeInTheDocument();
  });

  it("marks changed and added work and renders removed historical work", () => {
    const previous = { ...item, id: "changed", startDate: "2026-07-03" };
    const current = { ...previous, startDate: "2026-07-06" };
    const added = { ...item, id: "added", position: 2 };
    const removed = { ...item, id: "removed", position: 3, title: "Видалена робота" };
    const comparison = {
      addedIds: ["added"],
      removedItems: [removed],
      changed: [{ id: "changed", fields: ["startDate" as const] }],
      rescheduledIds: ["changed"],
    };

    const { container } = render(
      <ScheduleGrid
        items={[current, added]}
        allItems={[current, added]}
        previousItems={[previous, removed]}
        comparison={comparison}
        timelineDays={["2026-07-03", "2026-07-06"]}
        today="2026-07-04"
        editing={false}
        assignees={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onMoveBy={vi.fn()}
      />,
    );

    expect(screen.getByTestId("schedule-row-added")).toHaveClass("comparison-added");
    expect(screen.getByTestId("schedule-row-changed").querySelector(".changed-cell"))
      .toHaveAttribute("title", expect.stringContaining("Було:"));
    expect(container.querySelector(".removed-items")).toHaveTextContent("Видалена робота");
    expect(container.querySelector(".removed-items")).toHaveTextContent("Видалено");
  });
});
