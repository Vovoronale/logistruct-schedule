import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Assignee, ScheduleItem } from "../types";
import { GanttCells, GanttDayHeaders } from "./GanttTimeline";

const assignees: Assignee[] = [{
  id: "person-1",
  name: "ІВ",
  color: "#00B050",
  position: 1,
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
}];

const item: ScheduleItem = {
  id: "a",
  position: 1,
  section: "КЗ",
  sheetNumber: 1,
  title: "Робота A",
  startMode: "manual",
  startDate: "2026-07-06",
  durationDays: 4,
  predecessorIds: [],
  assignee: "ІВ",
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
};

describe("Gantt today styling", () => {
  it("marks configured holidays as weekends", () => {
    const { container } = render(
      <table><thead><tr><GanttDayHeaders
        days={["2026-07-06"]}
        holidays={new Set(["2026-07-06"])}
      /></tr></thead></table>,
    );
    expect(container.querySelector('th[title="2026-07-06"]')).toHaveClass("weekend");
  });
  it("marks past and today headers", () => {
    const { container } = render(
      <table><thead><tr>
        <GanttDayHeaders
          days={["2026-07-07", "2026-07-08", "2026-07-09"]}
          today="2026-07-08"
        />
      </tr></thead></table>,
    );

    expect(container.querySelector('th[title="2026-07-07"]')).toHaveClass("past");
    expect(screen.getByLabelText("Сьогодні")).toHaveClass("today");
    expect(screen.getByLabelText("Сьогодні")).toHaveAttribute("data-today", "true");
  });

  it("renders past work gray and keeps today and future in assignee color", () => {
    const { container } = render(
      <table><tbody><tr>
        <GanttCells
          item={item}
          days={["2026-07-07", "2026-07-08", "2026-07-09"]}
          assignees={assignees}
          today="2026-07-08"
        />
      </tr></tbody></table>,
    );

    const pastBar = container.querySelector('td[data-date="2026-07-07"] .gantt-bar');
    const todayBar = container.querySelector('td[data-date="2026-07-08"] .gantt-bar');
    expect(pastBar).toHaveClass("past-bar");
    expect(pastBar).toHaveStyle({ backgroundColor: "#A8B0BC" });
    expect(todayBar).not.toHaveClass("past-bar");
    expect(todayBar).toHaveStyle({ backgroundColor: "#00B050" });
  });
});

it("marks the first and last current bar segments as dependency anchors", () => {
  const { container } = render(
    <table><tbody><tr>
      <GanttCells
        item={item}
        days={["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09"]}
        assignees={assignees}
        today="2026-07-01"
      />
    </tr></tbody></table>,
  );

  const firstCurrentBar = container.querySelector(
    'td[data-date="2026-07-06"] .gantt-bar',
  );
  const lastCurrentBar = container.querySelector(
    'td[data-date="2026-07-09"] .gantt-bar',
  );
  expect(firstCurrentBar).toHaveAttribute("data-gantt-item", "a");
  expect(firstCurrentBar).toHaveAttribute("data-gantt-start", "true");
  expect(lastCurrentBar).toHaveAttribute("data-gantt-item", "a");
  expect(lastCurrentBar).toHaveAttribute("data-gantt-end", "true");
});

it("uses today as a dynamic start for current bars without a fixed start date", () => {
  const { container } = render(
    <table><tbody><tr>
      <GanttCells
        item={{ ...item, startDate: null, durationDays: 2 }}
        days={["2026-07-06", "2026-07-07", "2026-07-08"]}
        assignees={assignees}
        today="2026-07-06"
      />
    </tr></tbody></table>,
  );

  expect(container.querySelector('td[data-date="2026-07-06"] .gantt-bar'))
    .toHaveAttribute("data-gantt-start", "true");
  expect(container.querySelector('td[data-date="2026-07-07"] .gantt-bar'))
    .toBeInTheDocument();
});

it("draws a historical outline behind a shifted current bar", () => {
  const previousItem = { ...item, startDate: "2026-07-06" };
  const currentItem = { ...item, startDate: "2026-07-08" };
  const { container } = render(
    <table><tbody><tr>
      <GanttCells
        item={currentItem}
        previousItem={previousItem}
        days={["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09"]}
        assignees={assignees}
        today="2026-07-01"
      />
    </tr></tbody></table>,
  );

  expect(container.querySelector('td[data-date="2026-07-06"] .historical-bar'))
    .toHaveAttribute("aria-label", "Попередня версія: Робота A");
  expect(container.querySelector('td[data-date="2026-07-06"] .historical-bar'))
    .not.toHaveAttribute("data-gantt-item");
  expect(container.querySelector('td[data-date="2026-07-08"] .gantt-bar:not(.historical-bar)'))
    .toBeInTheDocument();
});
