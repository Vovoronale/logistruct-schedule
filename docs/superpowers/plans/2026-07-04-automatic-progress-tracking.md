# Automatic Progress Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Додати автоматичний відсоток виконання для кожного листа, динамічні підсумки розділів і загальний прогрес графіка.

**Architecture:** Чисті функції в `src/lib/progress.ts` обчислюють прогрес листа й зважені підсумки з однієї дати «Сьогодні». React-хук `useToday` підтримує спільну дату та оновлює її після локальної опівночі; `App` передає її панелі підсумків і таблиці. Усі значення похідні, тому API та D1 не змінюються.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, CSS.

---

## File map

- Create `src/lib/progress.ts` — чисті формули листа, розділів і загального підсумку.
- Create `src/lib/progress.test.ts` — модульні тести формул і динамічного групування.
- Modify `src/lib/dates.ts` — підрахунок робочих днів у напіввідкритому інтервалі.
- Modify `src/lib/dates.test.ts` — календарні граничні випадки.
- Create `src/hooks/useToday.ts` — одна поточна локальна дата з оновленням після опівночі.
- Create `src/hooks/useToday.test.tsx` — перевірка початкової дати та переходу дня.
- Create `src/components/ProgressOverview.tsx` — загальний і секційні індикатори.
- Create `src/components/ProgressOverview.test.tsx` — рендер підсумків і порожнього стану.
- Modify `src/components/ScheduleGrid.tsx` — read-only колонка «Виконання».
- Modify `src/App.tsx` — єдина дата, агрегація повного графіка та панель прогресу.
- Modify `src/App.test.tsx` — інтеграція колонки, підсумків і незалежність від фільтра.
- Modify `src/styles.css` — оформлення панелі, смуг прогресу й адаптивності.
- Modify `README.md` — документування автоматичного прогресу.

### Task 1: Робочі дні та чиста модель прогресу

**Files:**
- Modify: `src/lib/dates.ts`
- Modify: `src/lib/dates.test.ts`
- Create: `src/lib/progress.ts`
- Create: `src/lib/progress.test.ts`

- [ ] **Step 1: Write failing date and progress tests**

Add to `src/lib/dates.test.ts`:

```ts
import { addWorkingDays, buildTimelineDays, isWeekend, workingDaysAfter } from "./dates";

describe("workingDaysAfter", () => {
  it("starts at zero and excludes weekends", () => {
    expect(workingDaysAfter("2026-07-03", "2026-07-03")).toBe(0);
    expect(workingDaysAfter("2026-07-03", "2026-07-06")).toBe(1);
    expect(workingDaysAfter("2026-07-03", "2026-07-07")).toBe(2);
  });

  it("returns null for invalid dates and zero before the start", () => {
    expect(workingDaysAfter("bad-date", "2026-07-07")).toBeNull();
    expect(workingDaysAfter("2026-07-07", "2026-07-03")).toBe(0);
  });
});
```

Create `src/lib/progress.test.ts` with a `makeItem` helper and these assertions:

```ts
import { describe, expect, it } from "vitest";
import type { ScheduleItem } from "../types";
import { calculateItemProgress, calculateScheduleProgress } from "./progress";

function makeItem(patch: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "item-1", position: 1, section: "КЗ-0", sheetNumber: 1,
    title: "Лист", startDate: "2026-07-03", durationDays: 5,
    assignee: null, status: "planned",
    createdAt: "2026-07-03T00:00:00Z", updatedAt: "2026-07-03T00:00:00Z",
    ...patch,
  };
}

describe("calculateItemProgress", () => {
  it("is zero on the start day and grows only on later working days", () => {
    expect(calculateItemProgress(makeItem(), "2026-07-03")).toBe(0);
    expect(calculateItemProgress(makeItem(), "2026-07-06")).toBe(20);
    expect(calculateItemProgress(makeItem(), "2026-07-07")).toBe(40);
  });

  it("caps unfinished sheets at 95 percent", () => {
    expect(calculateItemProgress(makeItem(), "2026-07-31")).toBe(95);
  });

  it("gives completed valid sheets 100 percent", () => {
    expect(calculateItemProgress(makeItem({ status: "completed" }), "2026-07-03")).toBe(100);
  });

  it("excludes sheets without a start or duration", () => {
    expect(calculateItemProgress(makeItem({ startDate: null }), "2026-07-07")).toBeNull();
    expect(calculateItemProgress(makeItem({ durationDays: null }), "2026-07-07")).toBeNull();
  });
});

describe("calculateScheduleProgress", () => {
  it("weights sheets by duration and builds sections dynamically", () => {
    const result = calculateScheduleProgress([
      makeItem({ id: "a", section: "КЗ-10", durationDays: 10, status: "completed" }),
      makeItem({ id: "b", section: "КЗ-2", durationDays: 5, status: "planned" }),
      makeItem({ id: "c", section: "Новий", durationDays: 5, startDate: null }),
    ], "2026-07-03");

    expect(result.overall).toMatchObject({ percentage: 1000 / 15, sheetCount: 2, totalDays: 15 });
    expect(result.sections.map((section) => section.section)).toEqual(["КЗ-2", "КЗ-10"]);
    expect(result.sections[1]).toMatchObject({ percentage: 100, sheetCount: 1, totalDays: 10 });
  });

  it("returns no summary when every sheet is incomplete", () => {
    const result = calculateScheduleProgress([makeItem({ startDate: null })], "2026-07-03");
    expect(result).toEqual({ overall: null, sections: [] });
  });
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test -- src/lib/dates.test.ts src/lib/progress.test.ts`

Expected: FAIL because `workingDaysAfter` and `./progress` do not exist.

- [ ] **Step 3: Implement minimal date and progress functions**

Add to `src/lib/dates.ts`:

```ts
export function workingDaysAfter(startValue: string, endValue: string): number | null {
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (!start || !end) return null;
  if (end <= start) return 0;

  let count = 0;
  for (let cursor = shiftCalendarDays(start, 1); cursor <= end; cursor = shiftCalendarDays(cursor, 1)) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}
```

Create `src/lib/progress.ts`:

```ts
import type { ScheduleItem } from "../types";
import { addWorkingDays, workingDaysAfter } from "./dates";

export interface ProgressSummary {
  percentage: number;
  sheetCount: number;
  totalDays: number;
}

export interface SectionProgress extends ProgressSummary { section: string; }
export interface ScheduleProgress { overall: ProgressSummary | null; sections: SectionProgress[]; }

export function calculateItemProgress(item: ScheduleItem, today: string): number | null {
  if (!addWorkingDays(item.startDate, item.durationDays) || item.durationDays === null) return null;
  if (item.status === "completed") return 100;
  const elapsed = workingDaysAfter(item.startDate!, today);
  if (elapsed === null) return null;
  return Math.min(95, Math.max(0, (elapsed / item.durationDays) * 100));
}

export function calculateScheduleProgress(items: ScheduleItem[], today: string): ScheduleProgress {
  const groups = new Map<string, { earned: number; sheetCount: number; totalDays: number }>();
  let overallEarned = 0;
  let overallDays = 0;
  let overallCount = 0;

  for (const item of items) {
    const percentage = calculateItemProgress(item, today);
    if (percentage === null || item.durationDays === null) continue;
    const section = item.section.trim();
    if (!section) continue;
    const earned = item.durationDays * percentage;
    const group = groups.get(section) ?? { earned: 0, sheetCount: 0, totalDays: 0 };
    group.earned += earned;
    group.sheetCount += 1;
    group.totalDays += item.durationDays;
    groups.set(section, group);
    overallEarned += earned;
    overallCount += 1;
    overallDays += item.durationDays;
  }

  const sections = [...groups.entries()]
    .map(([section, value]) => ({
      section, sheetCount: value.sheetCount, totalDays: value.totalDays,
      percentage: value.earned / value.totalDays,
    }))
    .sort((a, b) => a.section.localeCompare(b.section, "uk-UA", { numeric: true, sensitivity: "base" }));

  return {
    overall: overallDays === 0 ? null : {
      percentage: overallEarned / overallDays,
      sheetCount: overallCount,
      totalDays: overallDays,
    },
    sections,
  };
}
```

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `npm test -- src/lib/dates.test.ts src/lib/progress.test.ts`

Expected: both test files PASS.

- [ ] **Step 5: Commit the calculation layer**

```powershell
git add src/lib/dates.ts src/lib/dates.test.ts src/lib/progress.ts src/lib/progress.test.ts
git commit -m "feat: calculate weighted schedule progress"
```

### Task 2: Shared current date hook

**Files:**
- Create: `src/hooks/useToday.ts`
- Create: `src/hooks/useToday.test.tsx`

- [ ] **Step 1: Write the failing hook test**

Create `src/hooks/useToday.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useToday } from "./useToday";

afterEach(() => { vi.useRealTimers(); });

describe("useToday", () => {
  it("updates after local midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 3, 23, 59, 59, 900));
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-07-03");
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("2026-07-04");
  });
});
```

- [ ] **Step 2: Run the hook test and confirm RED**

Run: `npm test -- src/hooks/useToday.test.tsx`

Expected: FAIL because `useToday` does not exist.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useToday.ts`:

```ts
import { useEffect, useState } from "react";

function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useToday(): string {
  const [today, setToday] = useState(() => localIsoDate());
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 20);
    const timeout = window.setTimeout(() => setToday(localIsoDate()), nextMidnight.getTime() - now.getTime());
    return () => window.clearTimeout(timeout);
  }, [today]);
  return today;
}
```

- [ ] **Step 4: Run hook test and confirm GREEN**

Run: `npm test -- src/hooks/useToday.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit shared-date support**

```powershell
git add src/hooks/useToday.ts src/hooks/useToday.test.tsx
git commit -m "feat: keep a shared current schedule date"
```

### Task 3: Progress overview component

**Files:**
- Create: `src/components/ProgressOverview.tsx`
- Create: `src/components/ProgressOverview.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `src/components/ProgressOverview.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressOverview } from "./ProgressOverview";

describe("ProgressOverview", () => {
  it("renders overall and section metrics", () => {
    render(<ProgressOverview progress={{
      overall: { percentage: 47.5, sheetCount: 3, totalDays: 20 },
      sections: [{ section: "КЗ-0", percentage: 25, sheetCount: 2, totalDays: 8 }],
    }} />);
    expect(screen.getByText("47,5%")).toBeVisible();
    expect(screen.getByText("КЗ-0")).toBeVisible();
    expect(screen.getByText("2 листи · 8 робочих днів")).toBeVisible();
  });

  it("renders an explicit empty state", () => {
    render(<ProgressOverview progress={{ overall: null, sections: [] }} />);
    expect(screen.getByText("Недостатньо даних для розрахунку")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run component test and confirm RED**

Run: `npm test -- src/components/ProgressOverview.test.tsx`

Expected: FAIL because `ProgressOverview` does not exist.

- [ ] **Step 3: Implement the overview**

Create `src/components/ProgressOverview.tsx`:

```tsx
import type { ProgressSummary, ScheduleProgress } from "../lib/progress";

const percentFormatter = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

function sheetWord(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "листів";
  if (last === 1) return "лист";
  if (last >= 2 && last <= 4) return "листи";
  return "листів";
}

function Metrics({ summary }: { summary: ProgressSummary }) {
  return <span>{summary.sheetCount} {sheetWord(summary.sheetCount)} · {summary.totalDays} робочих днів</span>;
}

export function ProgressOverview({ progress }: { progress: ScheduleProgress }) {
  if (!progress.overall) {
    return (
      <section className="progress-overview empty" aria-labelledby="progress-heading">
        <div><h2 id="progress-heading">Загальний прогрес</h2><p>Недостатньо даних для розрахунку</p></div>
      </section>
    );
  }

  return (
    <section className="progress-overview" aria-labelledby="progress-heading">
      <div className="overall-progress">
        <div className="progress-heading-row">
          <div><h2 id="progress-heading">Загальний прогрес</h2><Metrics summary={progress.overall} /></div>
          <strong>{formatPercent(progress.overall.percentage)}</strong>
        </div>
        <progress aria-label="Загальний прогрес" max={100} value={progress.overall.percentage} />
      </div>
      <div className="section-progress-grid" aria-label="Прогрес розділів">
        {progress.sections.map((section) => (
          <article className="section-progress-card" key={section.section}>
            <div className="progress-heading-row"><h3>{section.section}</h3><strong>{formatPercent(section.percentage)}</strong></div>
            <progress aria-label={`Прогрес розділу ${section.section}`} max={100} value={section.percentage} />
            <Metrics summary={section} />
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run component test and confirm GREEN**

Run: `npm test -- src/components/ProgressOverview.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the overview component**

```powershell
git add src/components/ProgressOverview.tsx src/components/ProgressOverview.test.tsx
git commit -m "feat: show project and section progress"
```

### Task 4: Integrate sheet progress into the application

**Files:**
- Modify: `src/components/ScheduleGrid.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Extend the integration fixture and write failing assertions**

In `src/App.test.tsx`, add a stable module mock, give the first item `startDate: "2026-07-03"` and `durationDays: 5`, and add a completed ten-day item in section `КМ2`:

```tsx
import userEvent from "@testing-library/user-event";

vi.mock("./hooks/useToday", () => ({ useToday: () => "2026-07-07" }));
```

Then assert:

```tsx
expect(await screen.findByRole("columnheader", { name: "Виконання" })).toBeVisible();
expect(screen.getByRole("progressbar", { name: /Виконання листа 1/ })).toHaveAttribute("value", "40");
expect(screen.getByRole("heading", { name: "Загальний прогрес" })).toBeVisible();
expect(screen.getByText("КЗ-0")).toBeVisible();
expect(screen.getByText("КМ2")).toBeVisible();
```

Add a filter test that types the title of only one item into the search field and confirms both section cards remain present.

```tsx
it("keeps whole-schedule summaries when the table is filtered", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText(schedule.items[0].title);
  await user.type(screen.getByRole("textbox", { name: "Пошук креслення" }), schedule.items[0].title);
  expect(screen.getByText("КЗ-0")).toBeVisible();
  expect(screen.getByText("КМ2")).toBeVisible();
});
```

- [ ] **Step 2: Run the integration test and confirm RED**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because the column and overview are absent.

- [ ] **Step 3: Integrate one shared date and unfiltered summaries**

In `src/App.tsx`:

```tsx
import { ProgressOverview } from "./components/ProgressOverview";
import { useToday } from "./hooks/useToday";
import { calculateScheduleProgress } from "./lib/progress";

const today = useToday();
const progress = useMemo(() => calculateScheduleProgress(schedule.items, today), [schedule.items, today]);
```

Render `<ProgressOverview progress={progress} />` after `EditActions` and before loading/error content. Pass `today={today}` to `ScheduleGrid`.

In `src/components/ScheduleGrid.tsx`, add `today: string` to props, calculate each row with `calculateItemProgress(item, today)`, and insert a read-only progress cell after status and before Gantt cells:

```tsx
const progress = calculateItemProgress(item, today);

<td className="sheet-progress-cell">
  {progress === null ? <span className="progress-unavailable">—</span> : (
    <div className="sheet-progress" title={`Виконання: ${formatProgress(progress)}`}>
      <progress aria-label={`Виконання листа ${item.position}`} max={100} value={progress} />
      <span>{formatProgress(progress)}</span>
    </div>
  )}
</td>
```

Add `<th rowSpan={2}>Виконання</th>` after the status header. Keep Gantt header colspans unchanged.

Define the formatter beside the component:

```ts
const progressFormatter = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const formatProgress = (value: number) => `${progressFormatter.format(value)}%`;
```

- [ ] **Step 4: Add focused styling**

Add to `src/styles.css` and extend the numbered table selectors through column 10:

```css
.progress-overview { margin: 0 24px 16px; padding: 16px; display: grid; gap: 14px; border: 1px solid var(--line); border-radius: 9px; background: #f8fafd; }
.progress-overview.empty { color: var(--muted); }
.progress-overview h2, .progress-overview h3, .progress-overview p { margin: 0; }
.progress-overview h2 { color: var(--navy); font-size: 17px; }
.progress-overview h3 { color: var(--navy); font-size: 13px; }
.progress-overview span, .progress-overview p { color: var(--muted); font-size: 11px; }
.progress-heading-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.progress-heading-row > div { display: grid; gap: 4px; }
.overall-progress { display: grid; gap: 9px; }
.overall-progress strong { color: var(--blue); font-size: 24px; }
.progress-overview progress, .sheet-progress progress { width: 100%; overflow: hidden; border: 0; border-radius: 999px; background: #dce5f1; accent-color: var(--blue); }
.progress-overview progress { height: 8px; }
.progress-overview progress::-webkit-progress-bar, .sheet-progress progress::-webkit-progress-bar { background: #dce5f1; border-radius: 999px; }
.progress-overview progress::-webkit-progress-value, .sheet-progress progress::-webkit-progress-value { background: var(--blue); border-radius: 999px; }
.progress-overview progress::-moz-progress-bar, .sheet-progress progress::-moz-progress-bar { background: var(--blue); border-radius: 999px; }
.section-progress-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 9px; }
.section-progress-card { min-width: 0; padding: 11px; display: grid; gap: 7px; border: 1px solid var(--line); border-radius: 7px; background: #fff; }
.section-progress-card strong { color: #315f9f; font-size: 13px; }
.sheet-progress { min-width: 76px; display: grid; grid-template-columns: minmax(35px, 1fr) auto; align-items: center; gap: 6px; }
.sheet-progress progress { height: 6px; }
.sheet-progress span { min-width: 34px; color: #315f9f; font-size: 10px; font-weight: 750; text-align: right; }
.progress-unavailable { color: var(--muted); }
.schedule-table thead tr:first-child > th:nth-child(10), .schedule-table tbody td:nth-child(10) { width: 104px; min-width: 104px; text-align: center; }
@media (max-width: 680px) {
  .progress-overview { margin-inline: 12px; }
  .section-progress-grid { display: flex; overflow-x: auto; }
  .section-progress-card { flex: 0 0 190px; }
}
```

- [ ] **Step 5: Run integration and component tests**

Run: `npm test -- src/App.test.tsx src/components/ProgressOverview.test.tsx src/lib/progress.test.ts src/hooks/useToday.test.tsx`

Expected: all test files PASS.

- [ ] **Step 6: Commit the application integration**

```powershell
git add src/App.tsx src/App.test.tsx src/components/ScheduleGrid.tsx src/styles.css
git commit -m "feat: display automatic schedule progress"
```

### Task 5: Documentation and full verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document behavior**

Add to the README feature list that each sheet, dynamically discovered section, and the complete project show a weighted automatic percentage. Document the 0%-on-start behavior, weekend exclusion, 95% unfinished cap, 100% completed override, and exclusion of sheets without dates/durations.

- [ ] **Step 2: Run full verification**

Run:

```powershell
npm test
npm run lint
npm run build
git diff --check
git status --short
```

Expected: all tests pass, lint exits 0, production build exits 0, diff check is clean, and status contains only intentional README changes plus the user's pre-existing untracked `AGENTS.md` and Excel workbook.

- [ ] **Step 3: Commit documentation**

```powershell
git add README.md
git commit -m "docs: explain automatic progress calculation"
```

- [ ] **Step 4: Recheck final repository state**

Run: `git status --short && git log --oneline -6`

Expected: only the user's pre-existing untracked `AGENTS.md` and Excel workbook remain; recent commits cover calculation, shared date, overview, integration, and documentation.
