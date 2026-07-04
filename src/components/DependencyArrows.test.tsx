import { render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleItem } from "../types";
import { DependencyArrows } from "./DependencyArrows";

const item = (
  id: string,
  position: number,
  predecessorIds: string[] = [],
): ScheduleItem => ({
  id,
  position,
  section: "КЗ",
  sheetNumber: position,
  title: id,
  startMode: predecessorIds.length ? "dependencies" : "manual",
  startDate: "2026-07-06",
  durationDays: 1,
  predecessorIds,
  assignee: null,
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
});

const items = [
  item("a", 1),
  item("b", 2, ["a"]),
  item("c", 3, ["b"]),
];

const geometry = {
  a: { start: 20, end: 60, y: 40 },
  b: { start: 90, end: 130, y: 100 },
  c: { start: 160, end: 200, y: 160 },
};

function rect(left: number, right: number, centerY: number): DOMRect {
  return {
    x: left,
    y: centerY - 10,
    left,
    right,
    top: centerY - 10,
    bottom: centerY + 10,
    width: right - left,
    height: 20,
    toJSON: () => ({}),
  };
}

function Harness({
  selectedId,
  visibleIds = ["a", "b", "c"],
  predecessorIds = new Set(["a"]),
  successorIds = new Set(["c"]),
}: {
  selectedId?: string | null;
  visibleIds?: string[];
  predecessorIds?: Set<string>;
  successorIds?: Set<string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={containerRef} data-testid="arrow-canvas">
      {visibleIds.flatMap((id) => [
        <span data-gantt-item={id} data-gantt-start="true" key={`${id}-start`} />,
        <span data-gantt-item={id} data-gantt-end="true" key={`${id}-end`} />,
      ])}
      <DependencyArrows
        containerRef={containerRef}
        items={items}
        selectedId={selectedId}
        predecessorIds={predecessorIds}
        successorIds={successorIds}
      />
    </div>
  );
}

beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockImplementation(function getBoundingClientRect(this: HTMLElement) {
      if (this.dataset.testid === "arrow-canvas") return rect(0, 400, 120);
      const id = this.dataset.ganttItem as keyof typeof geometry | undefined;
      if (!id) return rect(0, 0, 0);
      const itemGeometry = geometry[id];
      if (this.dataset.ganttStart === "true") {
        return rect(itemGeometry.start, itemGeometry.start + 20, itemGeometry.y);
      }
      return rect(itemGeometry.end - 20, itemGeometry.end, itemGeometry.y);
    });
});

afterEach(() => vi.restoreAllMocks());

describe("DependencyArrows", () => {
  it("renders nothing while dependency analysis is inactive", () => {
    render(<Harness selectedId={null} />);

    expect(screen.queryByTestId("dependency-arrow-overlay")).not.toBeInTheDocument();
  });

  it("renders arrowed predecessor and successor paths", async () => {
    render(<Harness selectedId="b" />);

    const overlay = await screen.findByTestId("dependency-arrow-overlay");
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(overlay.querySelectorAll('path[data-arrow-kind="complete"]')).toHaveLength(2);
    expect(overlay.querySelector(".dependency-arrow.predecessor"))
      .toHaveAttribute("marker-end", "url(#dependency-arrowhead-predecessor)");
    expect(overlay.querySelector(".dependency-arrow.successor"))
      .toHaveAttribute("marker-end", "url(#dependency-arrowhead-successor)");
    expect(overlay.querySelector('[data-arrow-edge="a->b"] path'))
      .toHaveAttribute("d", "M 60 -70 H 70 V -40 H 80 V -10 H 90");
  });

  it("renders an ellipsis when a related bar is filtered out", async () => {
    render(<Harness selectedId="b" visibleIds={["b", "c"]} />);

    expect(await screen.findByText("…")).toBeInTheDocument();
  });

  it("replaces routes after the selected chain changes", async () => {
    const { rerender } = render(<Harness selectedId="b" />);
    expect((await screen.findByTestId("dependency-arrow-overlay"))
      .querySelectorAll("path[data-arrow-kind]")).toHaveLength(2);

    rerender(
      <Harness
        selectedId="a"
        predecessorIds={new Set()}
        successorIds={new Set(["b"])}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dependency-arrow-overlay")
        .querySelectorAll("path[data-arrow-kind]"))
        .toHaveLength(1);
    });
  });
});
