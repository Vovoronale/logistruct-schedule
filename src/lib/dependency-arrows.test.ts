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
  ["a", { id: "a", position: 1, startX: 10, endX: 40, centerY: 20 }],
  ["b", { id: "b", position: 2, startX: 60, endX: 100, centerY: 80 }],
  ["c", { id: "c", position: 3, startX: 120, endX: 160, centerY: 140 }],
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

  it("builds complete arrowed paths from only horizontal and vertical segments", () => {
    const routes = buildDependencyArrowRoutes({ edges, items, anchors });

    expect(routes).toHaveLength(3);
    for (const route of routes) {
      expect(route.kind).toBe("complete");
      expect(route.path).toMatch(/^M \d+ \d+ H \d+ V \d+ H \d+$/u);
      expect(route.path).not.toContain(" L ");
      expect(route.markerEnd).toBe(true);
    }
  });

  it("uses separate vertical channels for parallel edges", () => {
    const routes = buildDependencyArrowRoutes({ edges, items, anchors });
    const fromA = routes.filter((route) => route.id.startsWith("a->"));
    const channels = fromA.map((route) => route.path.match(/ H (\d+) /u)?.[1]);

    expect(new Set(channels).size).toBe(2);
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
