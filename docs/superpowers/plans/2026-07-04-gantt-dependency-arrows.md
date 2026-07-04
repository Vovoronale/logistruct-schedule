# Gantt Dependency Arrows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render filter-aware orthogonal dependency arrows over the Gantt timeline while the existing dependency-analysis mode is active.

**Architecture:** A pure routing module selects real edges from the selected transitive chain and converts measured bar anchors into SVG paths or grouped hidden-endpoint stubs. A focused React overlay measures current Gantt bars through stable data attributes and renders one pointer-transparent SVG inside a shared table canvas.

**Tech Stack:** React 19, TypeScript, SVG, ResizeObserver, Vitest, Testing Library, Cloudflare Pages test server.

---

## File map

- Create `src/lib/dependency-arrows.ts`: edge selection, classification, orthogonal routing, hidden-edge grouping.
- Create `src/lib/dependency-arrows.test.ts`: pure routing behavior and boundary tests.
- Create `src/components/DependencyArrows.tsx`: DOM measurement lifecycle and SVG rendering.
- Create `src/components/DependencyArrows.test.tsx`: overlay visibility, markers, stubs, and rerender behavior.
- Modify `src/components/GanttTimeline.tsx`: expose stable start/end anchors for current bars.
- Modify `src/components/GanttTimeline.test.tsx`: verify anchor attributes and historical-bar exclusion.
- Modify `src/components/ScheduleGrid.tsx`: add the shared canvas wrapper and overlay props.
- Modify `src/components/ScheduleGrid.test.tsx`: verify overlay integration with filtered rows.
- Modify `src/components/ScheduleModes.tsx`: explain the ellipsis marker.
- Modify `src/components/ScheduleModes.test.tsx`: verify the legend note.
- Modify `src/styles.css`: canvas, SVG, path, marker, and label styling.

### Task 1: Pure edge selection and orthogonal routing

**Files:**
- Create: `src/lib/dependency-arrows.test.ts`
- Create: `src/lib/dependency-arrows.ts`

- [ ] **Step 1: Write failing edge-selection tests**

Create schedule items `a → b → c`, a direct side edge `a → c`, and unrelated `d`. Assert that `selectDependencyArrowEdges` returns the three real stored edges only, never synthesizes an extra edge, excludes `d`, and classifies edges entering the selected `b` as `predecessor` and edges leaving it as `successor`.

```ts
const edges = selectDependencyArrowEdges({
  items,
  selectedId: "b",
  predecessorIds: new Set(["a"]),
  successorIds: new Set(["c"]),
});

expect(edges).toEqual([
  { id: "a->b", fromId: "a", toId: "b", tone: "predecessor" },
  { id: "a->c", fromId: "a", toId: "c", tone: "successor" },
  { id: "b->c", fromId: "b", toId: "c", tone: "successor" },
]);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/lib/dependency-arrows.test.ts`

Expected: FAIL because `dependency-arrows.ts` does not exist.

- [ ] **Step 3: Implement edge selection and public types**

Define and export these contracts in `src/lib/dependency-arrows.ts`:

```ts
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
```

`selectDependencyArrowEdges` builds a chain set from the selected id plus both relation sets. For every item in `items`, emit one edge for each stored predecessor whose id and dependent id are both in the chain. Sort by `from.position`, then `to.position`, then id. Use successor tone when either endpoint is in `successorIds`; otherwise use predecessor tone.

- [ ] **Step 4: Write failing route and hidden-stub tests**

Use anchors for `a`, `b`, and `c` and assert:

```ts
const routes = buildDependencyArrowRoutes({ edges, items, anchors });
expect(routes[0].path).toMatch(/^M \d+ \d+ H \d+ V \d+ H \d+$/u);
expect(routes[0].path).not.toContain(" L ");
expect(routes[0].markerEnd).toBe(true);
```

Then omit anchor `a` and assert an inbound `hidden-predecessor` route ending at `b` with a marker and label `…`. Omit anchor `c` from two outbound edges sharing the same visible source and direction; assert a single `hidden-successor` route with no marker and label `… ×2`. Omit both endpoints and assert no route.

- [ ] **Step 5: Run the focused test and verify RED**

Run: `npm test -- src/lib/dependency-arrows.test.ts`

Expected: edge tests pass and route tests fail because `buildDependencyArrowRoutes` is missing.

- [ ] **Step 6: Implement complete routes and grouped stubs**

`buildDependencyArrowRoutes` receives edges, all items, and a `Map<string, GanttBarAnchor>`. For a complete edge, compute a stable lane from its sorted index, choose `channelX` at least 10 px to the right of the source and offset parallel routes by 4 px, and emit exactly `M/H/V/H` commands ending at `to.startX`.

For one missing anchor, group by visible id, hidden direction, tone, and vertical sign derived from item positions. Generate a 22 px horizontal by 18 px vertical short route. Inbound stubs end at the visible start and use `markerEnd: true`; outbound stubs start at the visible end and use `markerEnd: false`. The label is `…` for one edge and `… ×N` for several. Skip groups with no visible anchor.

- [ ] **Step 7: Run focused and dependency tests**

Run: `npm test -- src/lib/dependency-arrows.test.ts src/lib/dependencies.test.ts`

Expected: all tests pass.

- [ ] **Step 8: Commit the routing module**

```powershell
git add src/lib/dependency-arrows.ts src/lib/dependency-arrows.test.ts
git commit -m "feat: route gantt dependency arrows"
```

### Task 2: Gantt anchors and SVG overlay component

**Files:**
- Modify: `src/components/GanttTimeline.tsx`
- Modify: `src/components/GanttTimeline.test.tsx`
- Create: `src/components/DependencyArrows.tsx`
- Create: `src/components/DependencyArrows.test.tsx`

- [ ] **Step 1: Write failing Gantt-anchor assertions**

Extend `GanttTimeline.test.tsx` to assert the first and last current segments expose:

```ts
expect(firstCurrentBar).toHaveAttribute("data-gantt-item", "a");
expect(firstCurrentBar).toHaveAttribute("data-gantt-start", "true");
expect(lastCurrentBar).toHaveAttribute("data-gantt-end", "true");
expect(historicalBar).not.toHaveAttribute("data-gantt-item");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/components/GanttTimeline.test.tsx`

Expected: FAIL because current bars have no anchor attributes.

- [ ] **Step 3: Add stable current-bar anchors**

Add `data-gantt-item={item.id}`, `data-gantt-start={isFirst ? "true" : undefined}`, and `data-gantt-end={isLast ? "true" : undefined}` only to the current `.gantt-bar`. Do not add them to `.historical-bar`.

- [ ] **Step 4: Write failing overlay component tests**

Create a harness with a `containerRef`, mock `getBoundingClientRect()` for start/end spans, and render `DependencyArrows` with `a → b → c`. Assert:

- no SVG without `selectedId`;
- one `aria-hidden="true"` SVG with complete paths and `marker-end` when selected;
- predecessor and successor paths have distinct classes;
- removing `a` from rendered anchors creates a `…` label;
- rerendering with another selected id replaces routes rather than appending them.

- [ ] **Step 5: Run the overlay test and verify RED**

Run: `npm test -- src/components/DependencyArrows.test.tsx`

Expected: FAIL because `DependencyArrows.tsx` does not exist.

- [ ] **Step 6: Implement measurement and SVG rendering**

Implement `DependencyArrows` with this public prop shape:

```ts
interface DependencyArrowsProps {
  containerRef: RefObject<HTMLElement | null>;
  items: ScheduleItem[];
  selectedId?: string | null;
  predecessorIds?: Set<string>;
  successorIds?: Set<string>;
}
```

In `useLayoutEffect`, schedule one `requestAnimationFrame`, query paired `[data-gantt-item][data-gantt-start="true"]` and `[data-gantt-item][data-gantt-end="true"]` elements, convert their rectangles relative to the shared canvas, and build anchors with item positions. Observe the canvas with `ResizeObserver` and listen for `window.resize`; cancel the frame and observers on cleanup.

Render one `.dependency-arrow-overlay` SVG with measured canvas width/height, two marker definitions, paths with `data-arrow-kind` and `data-arrow-edge`, and text labels for stubs. Return `null` when analysis is inactive or no routes exist. Keep SVG `aria-hidden="true"` and `focusable="false"`.

- [ ] **Step 7: Run component tests**

Run: `npm test -- src/components/GanttTimeline.test.tsx src/components/DependencyArrows.test.tsx`

Expected: all tests pass.

- [ ] **Step 8: Commit anchors and overlay**

```powershell
git add src/components/GanttTimeline.tsx src/components/GanttTimeline.test.tsx src/components/DependencyArrows.tsx src/components/DependencyArrows.test.tsx
git commit -m "feat: render dependency arrow overlay"
```

### Task 3: Schedule integration, styles, and browser verification

**Files:**
- Modify: `src/components/ScheduleGrid.tsx`
- Modify: `src/components/ScheduleGrid.test.tsx`
- Modify: `src/components/ScheduleModes.tsx`
- Modify: `src/components/ScheduleModes.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing integration and legend tests**

In `ScheduleGrid.test.tsx`, render three dependent rows with timeline dates and selected analysis. Mock bar rectangles and assert `.dependency-arrow-overlay` appears inside `.schedule-canvas`. Rerender with a filtered visible list and full `allItems`; assert a hidden-endpoint label appears.

In `ScheduleModes.test.tsx`, assert analysis mode contains `… — пов’язана робота прихована фільтром`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- src/components/ScheduleGrid.test.tsx src/components/ScheduleModes.test.tsx`

Expected: FAIL because the canvas, overlay, and legend note are not integrated.

- [ ] **Step 3: Integrate the overlay into ScheduleGrid**

Add `canvasRef` beside the existing `scrollerRef`. Wrap the table and datalist in:

```tsx
<div ref={canvasRef} className="schedule-canvas">
  <table className="schedule-table">…</table>
  <DependencyArrows
    containerRef={canvasRef}
    items={props.allItems ?? props.items}
    selectedId={props.selectedAnalysisId}
    predecessorIds={props.predecessorIds}
    successorIds={props.successorIds}
  />
</div>
```

The overlay receives all items for real-edge selection, while DOM measurement naturally includes only rows currently rendered after filters.

- [ ] **Step 4: Add the hidden-link legend note**

Inside the analysis legend, add:

```tsx
<span className="hidden-dependency-key">… — пов’язана робота прихована фільтром</span>
```

- [ ] **Step 5: Add CSS for the canvas and SVG**

Add styles that keep the wrapper `position: relative; width: max-content; min-width: 100%`, position SVG absolutely over the content with `z-index: 3; pointer-events: none; overflow: visible`, and use 2 px non-scaling strokes. Use `#8064A2` for predecessor arrows and `#D8651F` for successor arrows. Stub labels use a white halo (`paint-order: stroke`) and 11 px bold text. Ensure sticky headers/columns remain above the overlay and the red today line remains visible.

- [ ] **Step 6: Run all automated checks**

Run: `npm test`

Expected: all Vitest tests pass.

Run: `npm run lint`

Expected: ESLint exits 0.

Run: `npm run build`

Expected: TypeScript and Vite build exit 0.

- [ ] **Step 7: Run browser QA on the isolated test server**

Reset the isolated fixture with `npm run db:test:reset`, start `npm run dev:test`, and open `http://127.0.0.1:8788` in the in-app browser. Select work №22 and verify incoming purple orthogonal arrows, arrowheads, and no diagonals. Select work №50/53 to verify orange outgoing paths. Apply a section or status filter that hides part of the chain and verify a grouped `… ×N` stub. Scroll both axes, clear analysis, and confirm arrows remain aligned then disappear. Check console warnings/errors and capture screenshots.

- [ ] **Step 8: Commit integration and styling**

```powershell
git add src/components/ScheduleGrid.tsx src/components/ScheduleGrid.test.tsx src/components/ScheduleModes.tsx src/components/ScheduleModes.test.tsx src/styles.css
git commit -m "feat: show dependency arrows on gantt"
```

- [ ] **Step 9: Final repository check**

Run: `git status --short --branch`

Expected: clean feature branch with only committed changes.
