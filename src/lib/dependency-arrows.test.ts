import { describe, expect, it } from "vitest";
import type { ScheduleItem } from "../types";
import {
  buildDependencyArrowRoutes,
  selectDependencyArrowEdges,
  type DependencyArrowEdge,
  type GanttBarAnchor,
} from "./dependency-arrows";

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
  startMode: predecessorIds.length > 0 ? "dependencies" : "manual",
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
  item("c", 3, ["a", "b"]),
  item("d", 4),
];

const anchors = new Map<string, GanttBarAnchor>([
  ["a", { id: "a", position: 1, startX: 10, endX: 40, topY: 10, bottomY: 30, centerY: 20 }],
  ["b", { id: "b", position: 2, startX: 60, endX: 100, topY: 70, bottomY: 90, centerY: 80 }],
  ["c", { id: "c", position: 3, startX: 120, endX: 160, topY: 130, bottomY: 150, centerY: 140 }],
]);

describe("selectDependencyArrowEdges", () => {
  it("selects only stored edges in the chosen transitive chain", () => {
    expect(selectDependencyArrowEdges({
      items,
      selectedId: "b",
      predecessorIds: new Set(["a"]),
      successorIds: new Set(["c"]),
    })).toEqual([
      { id: "a->b", fromId: "a", toId: "b", tone: "predecessor" },
      { id: "a->c", fromId: "a", toId: "c", tone: "successor" },
      { id: "b->c", fromId: "b", toId: "c", tone: "successor" },
    ]);
  });

  it("returns no edges when analysis is inactive", () => {
    expect(selectDependencyArrowEdges({
      items,
      selectedId: null,
      predecessorIds: new Set(),
      successorIds: new Set(),
    })).toEqual([]);
  });
});

describe("buildDependencyArrowRoutes", () => {
  const edges: DependencyArrowEdge[] = [
    { id: "a->b", fromId: "a", toId: "b", tone: "predecessor" },
    { id: "a->c", fromId: "a", toId: "c", tone: "successor" },
    { id: "b->c", fromId: "b", toId: "c", tone: "successor" },
  ];

  it("routes downward outside both connected bars", () => {
    const [route] = buildDependencyArrowRoutes({
      edges: [edges[0]],
      items,
      anchors,
    });

    expect(route.path).toBe("M 40 20 H 50 V 50 H 50 V 80 H 60");
    expect(route.path).toMatch(/^M \d+ \d+ H \d+ V \d+ H \d+ V \d+ H \d+$/u);
    expect(route.path).not.toContain(" L ");
    expect(route.markerEnd).toBe(true);
  });

  it("routes upward through the gap between connected bars", () => {
    const [route] = buildDependencyArrowRoutes({
      edges: [{ id: "c->a", fromId: "c", toId: "a", tone: "predecessor" }],
      items,
      anchors,
    });

    expect(route.path).toBe("M 160 140 H 170 V 80 H 0 V 20 H 10");
  });

  it("keeps lane offsets inside a narrow row gap", () => {
    const narrowAnchors = new Map<string, GanttBarAnchor>([
      ["a", { id: "a", position: 1, startX: 10, endX: 40, topY: 10, bottomY: 30, centerY: 20 }],
      ["b", { id: "b", position: 2, startX: 60, endX: 100, topY: 32, bottomY: 52, centerY: 42 }],
    ]);
    const parallelEdges: DependencyArrowEdge[] = Array.from({ length: 5 }, (_, index) => ({
      id: `a->b-${index}`,
      fromId: "a",
      toId: "b",
      tone: "predecessor",
    }));
    const routes = buildDependencyArrowRoutes({ edges: parallelEdges, items, anchors: narrowAnchors });
    const laneYs = routes.map((route) => Number(route.path.match(/ V (\d+) H/u)?.[1]));

    expect(laneYs.every((y) => y >= 30 && y <= 32)).toBe(true);
  });

  it("uses separate channels for parallel edges when the row gap allows it", () => {
    const parallelEdges: DependencyArrowEdge[] = Array.from({ length: 3 }, (_, index) => ({
      id: `a->b-${index}`,
      fromId: "a",
      toId: "b",
      tone: "predecessor",
    }));
    const routes = buildDependencyArrowRoutes({ edges: parallelEdges, items, anchors });
    const channels = routes.map((route) => route.path.match(/ V (\d+) H/u)?.[1]);

    expect(new Set(channels).size).toBe(3);
  });

  it("shows an inbound ellipsis stub for a hidden predecessor", () => {
    const routes = buildDependencyArrowRoutes({
      edges: [edges[0]],
      items,
      anchors: new Map([["b", anchors.get("b")!]]),
    });

    expect(routes).toEqual([expect.objectContaining({
      kind: "hidden-predecessor",
      markerEnd: true,
      label: "…",
    })]);
  });

  it("groups hidden successors by visible source and direction", () => {
    const outboundEdges: DependencyArrowEdge[] = [
      { id: "b->c", fromId: "b", toId: "c", tone: "successor" },
      { id: "b->d", fromId: "b", toId: "d", tone: "successor" },
    ];
    const routes = buildDependencyArrowRoutes({
      edges: outboundEdges,
      items,
      anchors: new Map([["b", anchors.get("b")!]]),
    });

    expect(routes).toEqual([expect.objectContaining({
      kind: "hidden-successor",
      markerEnd: false,
      label: "… ×2",
    })]);
  });

  it("skips edges when neither endpoint has visible geometry", () => {
    expect(buildDependencyArrowRoutes({
      edges: [edges[0]],
      items,
      anchors: new Map(),
    })).toEqual([]);
  });
});
