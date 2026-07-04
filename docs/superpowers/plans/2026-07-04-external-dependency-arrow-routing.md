# External Dependency Arrow Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route every complete dependency arrow outside both connected Gantt bars by using a five-segment orthogonal path through the gap between their rows.

**Architecture:** Extend each measured bar anchor with vertical bounds. Keep routing in the pure `dependency-arrows` module: derive an outside X coordinate for each endpoint and a lane-clamped Y coordinate between the two bars, then emit `H → V → H → V → H`. React remains responsible only for DOM measurement and SVG rendering.

**Tech Stack:** React 19, TypeScript 6, SVG, Vitest, Testing Library

---

## File map

- Modify `src/lib/dependency-arrows.ts`: extend anchor geometry and generate safe five-segment complete routes.
- Modify `src/lib/dependency-arrows.test.ts`: specify downward, upward, narrow-gap, and parallel-lane routing behavior.
- Modify `src/components/DependencyArrows.tsx`: measure and pass bar top/bottom coordinates.
- Modify `src/components/DependencyArrows.test.tsx`: verify DOM bounds produce the expected external route.

### Task 1: Specify safe complete-route geometry

**Files:**
- Modify: `src/lib/dependency-arrows.test.ts`

- [ ] **Step 1: Extend test anchors with vertical bounds**

Add `topY` and `bottomY` to every anchor fixture:

```ts
const anchors = new Map<string, GanttBarAnchor>([
  ["a", { id: "a", position: 1, startX: 10, endX: 40, topY: 10, bottomY: 30, centerY: 20 }],
  ["b", { id: "b", position: 2, startX: 60, endX: 100, topY: 70, bottomY: 90, centerY: 80 }],
  ["c", { id: "c", position: 3, startX: 120, endX: 160, topY: 130, bottomY: 150, centerY: 140 }],
]);
```

- [ ] **Step 2: Replace the three-segment assertion with exact outside-routing assertions**

```ts
it("routes downward outside both connected bars", () => {
  const [route] = buildDependencyArrowRoutes({
    edges: [edges[0]],
    items,
    anchors,
  });

  expect(route.path).toBe("M 40 20 H 50 V 50 H 50 V 80 H 60");
  expect(route.path).toMatch(/^M \d+ \d+ H \d+ V \d+ H \d+ V \d+ H \d+$/u);
  expect(route.path).not.toContain(" L ");
});

it("routes upward through the gap between connected bars", () => {
  const [route] = buildDependencyArrowRoutes({
    edges: [{ id: "c->a", fromId: "c", toId: "a", tone: "predecessor" }],
    items,
    anchors,
  });

  expect(route.path).toBe("M 160 140 H 170 V 80 H 0 V 20 H 10");
});
```

- [ ] **Step 3: Add narrow-gap and parallel-lane tests**

```ts
it("keeps lane offsets inside a narrow row gap", () => {
  const narrowAnchors = new Map<string, GanttBarAnchor>([
    ["a", { id: "a", position: 1, startX: 10, endX: 40, topY: 10, bottomY: 30, centerY: 20 }],
    ["b", { id: "b", position: 2, startX: 60, endX: 100, topY: 32, bottomY: 52, centerY: 42 }],
  ]);
  const routes = buildDependencyArrowRoutes({ edges, items, anchors: narrowAnchors });
  const laneYs = routes
    .filter((route) => route.kind === "complete")
    .map((route) => Number(route.path.match(/ V (\d+) H/u)?.[1]));

  expect(laneYs.every((y) => y >= 30 && y <= 32)).toBe(true);
});

it("uses deterministic separate lanes when the row gap allows it", () => {
  const routes = buildDependencyArrowRoutes({ edges, items, anchors });
  const laneYs = routes.map((route) => route.path.match(/ V (\d+) H/u)?.[1]);

  expect(new Set(laneYs).size).toBeGreaterThan(1);
});
```

- [ ] **Step 4: Run the focused tests and confirm the intended failure**

Run: `npm test -- src/lib/dependency-arrows.test.ts`

Expected: FAIL because `GanttBarAnchor` lacks `topY`/`bottomY` and complete paths still contain only three segments.

- [ ] **Step 5: Commit the failing specification**

```bash
git add src/lib/dependency-arrows.test.ts
git commit -m "test: specify external dependency arrow routing"
```

### Task 2: Implement five-segment routing

**Files:**
- Modify: `src/lib/dependency-arrows.ts`
- Test: `src/lib/dependency-arrows.test.ts`

- [ ] **Step 1: Extend the public anchor type**

```ts
export interface GanttBarAnchor {
  id: string;
  position: number;
  startX: number;
  endX: number;
  topY: number;
  bottomY: number;
  centerY: number;
}
```

- [ ] **Step 2: Add constants and a clamping helper**

```ts
const ENDPOINT_CLEARANCE = 10;
const LANE_SPACING = 4;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const laneOffset = (lane: number) => {
  if (lane === 0) return 0;
  const magnitude = Math.ceil(lane / 2) * LANE_SPACING;
  return lane % 2 === 1 ? magnitude : -magnitude;
};
```

- [ ] **Step 3: Replace `completeRoute` with external routing**

```ts
function completeRoute(
  edge: DependencyArrowEdge,
  from: GanttBarAnchor,
  to: GanttBarAnchor,
  lane: number,
): DependencyArrowRoute {
  const sourceX = coordinate(from.endX + ENDPOINT_CLEARANCE);
  const targetX = coordinate(to.startX - ENDPOINT_CLEARANCE);
  const movingDown = to.centerY >= from.centerY;
  const gapStart = movingDown ? from.bottomY : to.bottomY;
  const gapEnd = movingDown ? to.topY : from.topY;
  const minimumY = Math.min(gapStart, gapEnd);
  const maximumY = Math.max(gapStart, gapEnd);
  const midpointY = (minimumY + maximumY) / 2;
  const channelY = coordinate(clamp(midpointY + laneOffset(lane), minimumY, maximumY));

  return {
    id: edge.id,
    tone: edge.tone,
    kind: "complete",
    path: `M ${coordinate(from.endX)} ${coordinate(from.centerY)} H ${sourceX} V ${channelY} H ${targetX} V ${coordinate(to.centerY)} H ${coordinate(to.startX)}`,
    markerEnd: true,
  };
}
```

- [ ] **Step 4: Run focused unit tests**

Run: `npm test -- src/lib/dependency-arrows.test.ts`

Expected: PASS for complete and hidden route tests.

- [ ] **Step 5: Commit the router implementation**

```bash
git add src/lib/dependency-arrows.ts src/lib/dependency-arrows.test.ts
git commit -m "feat: route dependency arrows outside gantt bars"
```

### Task 3: Measure vertical bar bounds in React

**Files:**
- Modify: `src/components/DependencyArrows.test.tsx`
- Modify: `src/components/DependencyArrows.tsx`

- [ ] **Step 1: Add a component assertion for the measured route**

Append this assertion to `renders arrowed predecessor and successor paths` after obtaining `overlay`:

```ts
expect(overlay.querySelector('[data-arrow-edge="a->b"] path'))
  .toHaveAttribute("d", "M 60 40 H 70 V 70 H 80 V 100 H 90");
```

- [ ] **Step 2: Run the component test and confirm failure**

Run: `npm test -- src/components/DependencyArrows.test.tsx`

Expected: FAIL because measured anchors do not yet include `topY` and `bottomY`.

- [ ] **Step 3: Add vertical bounds in `measureAnchors`**

Extend the object passed to `anchors.set`:

```ts
anchors.set(id, {
  id,
  position,
  startX: startRect.left - containerRect.left,
  endX: endRect.right - containerRect.left,
  topY: startRect.top - containerRect.top,
  bottomY: startRect.bottom - containerRect.top,
  centerY: (startRect.top + startRect.bottom) / 2 - containerRect.top,
});
```

- [ ] **Step 4: Run router and component tests**

Run: `npm test -- src/lib/dependency-arrows.test.ts src/components/DependencyArrows.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit DOM measurement support**

```bash
git add src/components/DependencyArrows.tsx src/components/DependencyArrows.test.tsx
git commit -m "feat: measure gantt bar bounds for arrow routing"
```

### Task 4: Verify the complete change

**Files:**
- Verify only

- [ ] **Step 1: Run all automated tests**

Run: `npm test`

Expected: all test files pass with no failures.

- [ ] **Step 2: Run lint and type checking**

Run: `npm run lint`

Expected: exit code 0.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 3: Build the production bundle**

Run: `npm run build`

Expected: exit code 0 and a successful Vite production build.

- [ ] **Step 4: Confirm only intended files changed**

Run: `git status --short`

Expected: no uncommitted files from this implementation.
