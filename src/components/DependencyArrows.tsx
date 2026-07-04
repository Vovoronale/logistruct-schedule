import {
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";
import {
  buildDependencyArrowRoutes,
  selectDependencyArrowEdges,
  type DependencyArrowRoute,
  type GanttBarAnchor,
} from "../lib/dependency-arrows";
import type { ScheduleItem } from "../types";

interface DependencyArrowsProps {
  containerRef: RefObject<HTMLElement | null>;
  items: ScheduleItem[];
  selectedId?: string | null;
  predecessorIds?: Set<string>;
  successorIds?: Set<string>;
}

interface OverlayGeometry {
  width: number;
  height: number;
  routes: DependencyArrowRoute[];
}

const EMPTY_IDS = new Set<string>();
const EMPTY_GEOMETRY: OverlayGeometry = { width: 0, height: 0, routes: [] };

function measureAnchors(
  container: HTMLElement,
  items: ScheduleItem[],
): Map<string, GanttBarAnchor> {
  const containerRect = container.getBoundingClientRect();
  const positions = new Map(items.map((item) => [item.id, item.position]));
  const starts = new Map<string, HTMLElement>();
  const ends = new Map<string, HTMLElement>();

  for (const element of container.querySelectorAll<HTMLElement>(
    '[data-gantt-item][data-gantt-start="true"]',
  )) {
    const id = element.dataset.ganttItem;
    if (id) starts.set(id, element);
  }
  for (const element of container.querySelectorAll<HTMLElement>(
    '[data-gantt-item][data-gantt-end="true"]',
  )) {
    const id = element.dataset.ganttItem;
    if (id) ends.set(id, element);
  }

  const anchors = new Map<string, GanttBarAnchor>();
  for (const [id, startElement] of starts) {
    const endElement = ends.get(id);
    const position = positions.get(id);
    if (!endElement || position === undefined) continue;
    const startRect = startElement.getBoundingClientRect();
    const endRect = endElement.getBoundingClientRect();
    anchors.set(id, {
      id,
      position,
      startX: startRect.left - containerRect.left,
      endX: endRect.right - containerRect.left,
      topY: startRect.top - containerRect.top,
      bottomY: startRect.bottom - containerRect.top,
      centerY: (startRect.top + startRect.bottom) / 2 - containerRect.top,
    });
  }
  return anchors;
}

export function DependencyArrows({
  containerRef,
  items,
  selectedId,
  predecessorIds = EMPTY_IDS,
  successorIds = EMPTY_IDS,
}: DependencyArrowsProps) {
  const [geometry, setGeometry] = useState<OverlayGeometry>(EMPTY_GEOMETRY);
  const edges = useMemo(() => selectDependencyArrowEdges({
    items,
    selectedId,
    predecessorIds,
    successorIds,
  }), [items, predecessorIds, selectedId, successorIds]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !selectedId || edges.length === 0) {
      setGeometry(EMPTY_GEOMETRY);
      return undefined;
    }

    let frame = 0;
    const measure = () => {
      const rect = container.getBoundingClientRect();
      const anchors = measureAnchors(container, items);
      setGeometry({
        width: Math.max(container.scrollWidth, rect.width),
        height: Math.max(container.scrollHeight, rect.height),
        routes: buildDependencyArrowRoutes({ edges, items, anchors }),
      });
    };
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(scheduleMeasure);
    observer?.observe(container);
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [containerRef, edges, items, selectedId]);

  if (!selectedId || geometry.routes.length === 0) return null;

  return (
    <svg
      aria-hidden="true"
      className="dependency-arrow-overlay"
      data-testid="dependency-arrow-overlay"
      focusable="false"
      height={geometry.height}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      width={geometry.width}
    >
      <defs>
        <marker
          id="dependency-arrowhead-predecessor"
          markerHeight="7"
          markerUnits="strokeWidth"
          markerWidth="7"
          orient="auto"
          refX="6"
          refY="3.5"
          viewBox="0 0 7 7"
        >
          <path className="dependency-arrowhead predecessor" d="M 0 0 L 7 3.5 L 0 7 Z" />
        </marker>
        <marker
          id="dependency-arrowhead-successor"
          markerHeight="7"
          markerUnits="strokeWidth"
          markerWidth="7"
          orient="auto"
          refX="6"
          refY="3.5"
          viewBox="0 0 7 7"
        >
          <path className="dependency-arrowhead successor" d="M 0 0 L 7 3.5 L 0 7 Z" />
        </marker>
      </defs>
      {geometry.routes.map((route) => (
        <g data-arrow-edge={route.id} key={route.id}>
          <path
            className={`dependency-arrow ${route.tone}`}
            d={route.path}
            data-arrow-kind={route.kind}
            markerEnd={route.markerEnd
              ? `url(#dependency-arrowhead-${route.tone})`
              : undefined}
          />
          {route.label ? (
            <text
              className={`dependency-arrow-label ${route.tone}`}
              textAnchor={route.kind === "hidden-predecessor" ? "end" : "start"}
              x={route.labelX}
              y={route.labelY}
            >
              {route.label}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
