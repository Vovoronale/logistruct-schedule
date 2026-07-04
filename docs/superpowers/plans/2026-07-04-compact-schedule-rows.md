# Compact Schedule Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce every schedule body row from 58px to 44px while keeping controls and Gantt content vertically aligned.

**Architecture:** Keep row density controlled by the existing shared CSS variable and cell rule. Adjust the three absolutely positioned row children to the new geometry, without changing React markup or data flow.

**Tech Stack:** CSS, Vitest, TypeScript, Vite, in-app Browser

---

### Task 1: Lock compact row geometry with a regression test

**Files:**
- Create: `tests/styles.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("schedule row styles", () => {
  it("keeps schedule rows compact and vertically aligned", () => {
    const css = readFileSync("src/styles.css", "utf8");

    expect(css).toContain("--row-height: 44px;");
    expect(css).toMatch(/\.schedule-table th, \.schedule-table td \{[^}]*padding: 3px 9px;/s);
    expect(css).toMatch(/\.gantt-bar \{[^}]*top: 9px;[^}]*height: 27px;/s);
    expect(css).toMatch(/\.historical-bar \{[^}]*top: 4px;[^}]*height: 37px;/s);
    expect(css).toMatch(/\.drag-handle \{[^}]*top: 12px;/s);
  });
});
```

- [ ] **Step 2: Verify the test fails for the old 58px geometry**

Run: `npm test -- tests/styles.test.ts`
Expected: FAIL because `--row-height: 44px;` is absent.

### Task 2: Implement compact geometry

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Apply the minimal CSS changes**

```css
--row-height: 44px;
.schedule-table th, .schedule-table td { padding: 3px 9px; }
.gantt-bar { top: 9px; height: 27px; }
.historical-bar { top: 4px; height: 37px; }
.drag-handle { top: 12px; }
```

- [ ] **Step 2: Verify the focused test passes**

Run: `npm test -- tests/styles.test.ts`
Expected: PASS, 1 test passed.

- [ ] **Step 3: Run repository verification**

Run: `npm test -- --run && npm run lint && npm run build`
Expected: all tests pass, ESLint exits 0, and Vite build exits 0.

### Task 3: Validate the rendered result

**Files:**
- No source files changed.

- [ ] **Step 1: Reload the test server and inspect the target row**

Open `http://127.0.0.1:8788/`, reload after the build, and verify row 6 plus adjacent rows are 44px tall with unclipped content and centered Gantt bars.

- [ ] **Step 2: Check runtime health and interaction**

Confirm the page identity, non-blank DOM, absence of framework overlays and relevant console errors, then use a visible schedule control and verify the table updates.

- [ ] **Step 3: Commit the implementation**

Run: `git add tests/styles.test.ts src/styles.css docs/superpowers/plans/2026-07-04-compact-schedule-rows.md && git commit -m "style: compact schedule rows"`
Expected: one implementation commit containing the test, CSS, and plan.
