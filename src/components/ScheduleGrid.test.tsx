import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ScheduleItem } from "../types";
import { ScheduleGrid } from "./ScheduleGrid";

const item: ScheduleItem = {
  id: "drawing-001",
  position: 1,
  section: "КЗ-0",
  sheetNumber: 1,
  title: "Заголовний лист",
  startDate: "2026-07-03",
  durationDays: 1,
  assignee: null,
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
};

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
});
