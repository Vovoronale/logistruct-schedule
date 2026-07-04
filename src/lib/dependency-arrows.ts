import type { ScheduleItem } from "../types";

export type DependencyArrowTone = "predecessor" | "successor";

export interface DependencyArrowEdge {
  id: string;
  fromId: string;
  toId: string;
  tone: DependencyArrowTone;
}

export interface GanttBarAnchor {
  id: string;
  position: number;
  startX: number;
  endX: number;
  centerY: number;
}

export interface DependencyArrowRoute {
  id: string;
  tone: DependencyArrowTone;
  kind: "complete" | "hidden-predecessor" | "hidden-successor";
  path: string;
  markerEnd: boolean;
  label?: string;
  labelX?: number;
  labelY?: number;
}

interface SelectDependencyArrowEdgesInput {
  items: ScheduleItem[];
  selectedId: string | null | undefined;
  predecessorIds: Set<string>;
  successorIds: Set<string>;
}

export function selectDependencyArrowEdges({
  items,
  selectedId,
  predecessorIds,
  successorIds,
}: SelectDependencyArrowEdgesInput): DependencyArrowEdge[] {
  if (!selectedId) return [];
  const chain = new Set([selectedId, ...predecessorIds, ...successorIds]);
  const byId = new Map(items.map((item) => [item.id, item]));
  const edges: DependencyArrowEdge[] = [];

  for (const dependent of items) {
    if (!chain.has(dependent.id)) continue;
    for (const predecessorId of dependent.predecessorIds) {
      if (!chain.has(predecessorId) || !byId.has(predecessorId)) continue;
      const tone = successorIds.has(predecessorId) || successorIds.has(dependent.id)
        ? "successor"
        : "predecessor";
      edges.push({
        id: `${predecessorId}->${dependent.id}`,
        fromId: predecessorId,
        toId: dependent.id,
        tone,
      });
    }
  }

  return edges.sort((left, right) => {
    const fromDifference = (byId.get(left.fromId)?.position ?? 0)
      - (byId.get(right.fromId)?.position ?? 0);
    if (fromDifference !== 0) return fromDifference;
    const toDifference = (byId.get(left.toId)?.position ?? 0)
      - (byId.get(right.toId)?.position ?? 0);
    return toDifference !== 0 ? toDifference : left.id.localeCompare(right.id);
  });
}

interface BuildDependencyArrowRoutesInput {
  edges: DependencyArrowEdge[];
  items: ScheduleItem[];
  anchors: Map<string, GanttBarAnchor>;
}

interface HiddenGroup {
  visible: GanttBarAnchor;
  tone: DependencyArrowTone;
  kind: "hidden-predecessor" | "hidden-successor";
  sign: -1 | 1;
  count: number;
}

const coordinate = (value: number) => Math.round(value);

function completeRoute(
  edge: DependencyArrowEdge,
  from: GanttBarAnchor,
  to: GanttBarAnchor,
  lane: number,
): DependencyArrowRoute {
  const horizontalGap = Math.abs(to.startX - from.endX);
  const channelOffset = Math.max(10, Math.min(26, horizontalGap / 2)) + lane * 4;
  const channelX = coordinate(from.endX + channelOffset);
  return {
    id: edge.id,
    tone: edge.tone,
    kind: "complete",
    path: `M ${coordinate(from.endX)} ${coordinate(from.centerY)} H ${channelX} V ${coordinate(to.centerY)} H ${coordinate(to.startX)}`,
    markerEnd: true,
  };
}

function hiddenRoute(group: HiddenGroup): DependencyArrowRoute {
  const label = group.count === 1 ? "…" : `… ×${group.count}`;
  const verticalY = coordinate(group.visible.centerY + group.sign * 18);
  if (group.kind === "hidden-predecessor") {
    const startX = coordinate(group.visible.startX - 22);
    return {
      id: `${group.kind}-${group.visible.id}-${group.tone}-${group.sign}`,
      tone: group.tone,
      kind: group.kind,
      path: `M ${startX} ${verticalY} H ${coordinate(group.visible.startX - 12)} V ${coordinate(group.visible.centerY)} H ${coordinate(group.visible.startX)}`,
      markerEnd: true,
      label,
      labelX: startX - 5,
      labelY: verticalY + 4,
    };
  }

  const endX = coordinate(group.visible.endX + 22);
  return {
    id: `${group.kind}-${group.visible.id}-${group.tone}-${group.sign}`,
    tone: group.tone,
    kind: group.kind,
    path: `M ${coordinate(group.visible.endX)} ${coordinate(group.visible.centerY)} H ${coordinate(group.visible.endX + 12)} V ${verticalY} H ${endX}`,
    markerEnd: false,
    label,
    labelX: endX + 5,
    labelY: verticalY + 4,
  };
}

export function buildDependencyArrowRoutes({
  edges,
  items,
  anchors,
}: BuildDependencyArrowRoutesInput): DependencyArrowRoute[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const routes: DependencyArrowRoute[] = [];
  const hiddenGroups = new Map<string, HiddenGroup>();

  for (const [index, edge] of edges.entries()) {
    const from = anchors.get(edge.fromId);
    const to = anchors.get(edge.toId);
    if (from && to) {
      routes.push(completeRoute(edge, from, to, index % 5));
      continue;
    }
    if (!from && !to) continue;

    const hiddenItem = byId.get(from ? edge.toId : edge.fromId);
    const visible = from ?? to;
    if (!hiddenItem || !visible) continue;
    const kind = from ? "hidden-successor" : "hidden-predecessor";
    const sign = hiddenItem.position < visible.position ? -1 : 1;
    const key = `${kind}:${visible.id}:${edge.tone}:${sign}`;
    const current = hiddenGroups.get(key);
    if (current) current.count += 1;
    else hiddenGroups.set(key, {
      visible,
      tone: edge.tone,
      kind,
      sign,
      count: 1,
    });
  }

  return [
    ...routes,
    ...[...hiddenGroups.values()].map(hiddenRoute),
  ];
}
