# Compact Day Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every rendered schedule day column fixed at exactly 24 pixels without viewport-driven expansion.

**Architecture:** `ScheduleGrid` will define the calendar columns structurally with a `colgroup`, giving the browser one explicit column per timeline day. CSS will use one shared width variable for the column definitions, day headers, and timeline cells, while the table will size to its content and leave overflow to the existing scroller.

**Tech Stack:** React 19, TypeScript, CSS tables, Vitest, Testing Library, Vite

---

### Task 1: Add a structural regression test

**Files:**
- Create: `src/components/ScheduleGrid.test.tsx`
- Test: `src/components/ScheduleGrid.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScheduleGrid } from "./ScheduleGrid";
import type { ScheduleItem } from "../types";

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
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `npm test -- src/components/ScheduleGrid.test.tsx`

Expected: FAIL because the current table renders no `col.timeline-day-column` elements.

### Task 2: Define fixed calendar columns

**Files:**
- Modify: `src/components/ScheduleGrid.tsx`
- Modify: `src/styles.css`
- Test: `src/components/ScheduleGrid.test.tsx`

- [ ] **Step 1: Add a `colgroup` for timeline days**

Inside the `schedule-table`, before `<thead>`, render the column definitions only when timeline days exist:

```tsx
{props.timelineDays.length > 0 ? (
  <colgroup>
    {Array.from({ length: 9 }, (_, index) => <col key={`schedule-column-${index}`} />)}
    {props.timelineDays.map((day) => <col className="timeline-day-column" key={day} />)}
  </colgroup>
) : null}
```

- [ ] **Step 2: Centralize and enforce the 24-pixel width**

Add the variable to `:root`:

```css
--day-column-width: 24px;
```

Change the table sizing rule to:

```css
.schedule-table { border-collapse: separate; border-spacing: 0; table-layout: fixed; width: max-content; font-size: 12px; color: #17325c; }
```

Add the structural column rule and update both rendered cell rules:

```css
.timeline-day-column,
.day-header,
.timeline-cell {
  width: var(--day-column-width);
  min-width: var(--day-column-width);
  max-width: var(--day-column-width);
}
```

Retain the remaining header- and cell-specific declarations without duplicate width values:

```css
.day-header { height: 46px !important; padding: 4px 0 !important; top: var(--header-top) !important; }
.timeline-cell { padding: 0 !important; position: relative; }
```

- [ ] **Step 3: Run the focused test and verify it passes**

Run: `npm test -- src/components/ScheduleGrid.test.tsx`

Expected: PASS with one calendar `<col>` for each of the three supplied dates.

### Task 3: Verify behavior and quality

**Files:**
- Verify: `src/components/ScheduleGrid.tsx`
- Verify: `src/styles.css`
- Verify: `src/components/ScheduleGrid.test.tsx`

- [ ] **Step 1: Run the full automated checks**

Run:

```powershell
npm test
npm run lint
npm run build
```

Expected: all tests pass, ESLint exits successfully, and the production build completes without TypeScript or Vite errors.

- [ ] **Step 2: Validate computed widths in the browser**

Start the existing Vite development server with `npm run dev -- --host 127.0.0.1`. Load the schedule, then inspect at least three `.day-header` elements and their corresponding `.timeline-cell` elements at desktop and narrow viewport widths.

Expected: every measured width is `24`, all measured widths are equal, the table scrolls horizontally, and month/day/body boundaries remain aligned. The page has no relevant console errors or framework error overlay.

- [ ] **Step 3: Confirm the final diff and commit**

Run:

```powershell
git diff --check
git status --short
git add src/components/ScheduleGrid.test.tsx src/components/ScheduleGrid.tsx src/styles.css
git commit -m "fix: keep day columns compact"
```

Expected: only the intended implementation and test files are staged; pre-existing untracked user files remain untouched.
