# Additional Holidays Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load manually maintained dates from `public/holidays.json` and treat them as global non-working days in scheduling, progress, dependency, and Gantt calculations.

**Architecture:** Add a small holiday parser/loader boundary and pass a normalized `ReadonlySet<string>` explicitly into pure calendar functions. The client loads the static file once, uses the set for every derived value, and submits its normalized dates with saves so server-side dependency validation uses identical calendar semantics.

**Tech Stack:** React 19, TypeScript 6, Vite, Vitest, Testing Library, Cloudflare Pages Functions.

---

## File map

- Create `public/holidays.json`: manually maintained production configuration.
- Create `src/lib/holidays.ts` and `src/lib/holidays.test.ts`: validation, normalization, and resilient browser loading.
- Create `src/hooks/useHolidays.ts` and `src/hooks/useHolidays.test.tsx`: one-time application-level loading state.
- Modify `src/types.ts`: include normalized holiday dates in save-only drafts.
- Modify `src/lib/dates.ts` and tests: central non-working-day predicate and holiday-aware date arithmetic.
- Modify `src/lib/dependencies.ts`, `src/lib/progress.ts`, `src/lib/schedule.ts` and tests: thread the holiday set through derived scheduling behavior.
- Modify `src/hooks/useSchedule.ts` and tests: recalculate and save using the same holidays.
- Modify `functions/lib/validation.ts`, its tests, and `functions/api/schedule.ts`: validate submitted holiday configuration and recalculate dependency dates consistently.
- Modify `src/App.tsx`, `src/components/ScheduleGrid.tsx`, `src/components/GanttTimeline.tsx` and tests: load, distribute, and visually mark additional holidays.

### Task 1: Parse and load the static holiday file

**Files:**
- Create: `public/holidays.json`
- Create: `src/lib/holidays.ts`
- Create: `src/lib/holidays.test.ts`
- Create: `src/hooks/useHolidays.ts`
- Create: `src/hooks/useHolidays.test.tsx`

- [ ] **Step 1: Write failing parser and loader tests**

Test `normalizeHolidays(["2026-08-24", "bad", "2026-08-24", "2026-02-30"])` equals `new Set(["2026-08-24"])`; non-array input yields an empty set; `loadHolidays()` returns an empty set for a rejected fetch, non-OK response, or invalid JSON. Hook tests must wait for a successful response and assert the normalized set is exposed.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- src/lib/holidays.test.ts src/hooks/useHolidays.test.tsx`

Expected: FAIL because both modules are absent.

- [ ] **Step 3: Add the minimal configuration and implementation**

Create `public/holidays.json`:

```json
[]
```

Implement the shared parser and resilient loader:

```ts
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}

export function normalizeHolidays(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter(isValidIsoDate));
}

export async function loadHolidays(fetcher: typeof fetch = fetch): Promise<Set<string>> {
  try {
    const response = await fetcher("/holidays.json");
    if (!response.ok) return new Set();
    return normalizeHolidays(await response.json());
  } catch {
    return new Set();
  }
}
```

Implement `useHolidays` with `useEffect`/`useState`, an `active` cleanup flag, and an initially empty `Set<string>`; load once and replace state only while active.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/lib/holidays.test.ts src/hooks/useHolidays.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/holidays.json src/lib/holidays.ts src/lib/holidays.test.ts src/hooks/useHolidays.ts src/hooks/useHolidays.test.tsx
git commit -m "feat: load additional holidays"
```

### Task 2: Make core calendar arithmetic holiday-aware

**Files:**
- Modify: `src/lib/dates.ts`
- Modify: `src/lib/dates.test.ts`

- [ ] **Step 1: Add failing calendar tests**

Add assertions covering:

```ts
const holidays = new Set(["2026-07-06"]);
expect(isNonWorkingDay("2026-07-06", holidays)).toBe(true);
expect(addWorkingDays("2026-07-03", 2, holidays)).toBe("2026-07-08");
expect(workingDaysAfter("2026-07-03", "2026-07-07", holidays)).toBe(1);
expect(buildTimelineDays(
  [{ startDate: "2026-07-03", durationDays: 2 }],
  "2026-07-03",
  holidays,
)).toContain("2026-07-08");
```

- [ ] **Step 2: Verify the new tests fail**

Run: `npm test -- src/lib/dates.test.ts`

Expected: FAIL because the functions do not accept or apply holidays.

- [ ] **Step 3: Implement one shared predicate and optional parameters**

Add:

```ts
export type HolidaySet = ReadonlySet<string>;
const NO_HOLIDAYS: HolidaySet = new Set<string>();

export function isNonWorkingDay(value: string, holidays: HolidaySet = NO_HOLIDAYS): boolean {
  return isWeekend(value) || holidays.has(value);
}
```

Add `holidays: HolidaySet = NO_HOLIDAYS` to `addWorkingDays`, `workingDaysAfter`, and as the third parameter of `buildTimelineDays`. Replace direct weekday checks with `isNonWorkingDay(toIsoDate(cursor), holidays)` and pass holidays from `buildTimelineDays` into `addWorkingDays`.

- [ ] **Step 4: Run calendar tests**

Run: `npm test -- src/lib/dates.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts
git commit -m "feat: exclude configured holidays from workdays"
```

### Task 3: Propagate holidays through schedule calculations and saves

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/dependencies.ts`
- Modify: `src/lib/dependencies.test.ts`
- Modify: `src/lib/progress.ts`
- Modify: `src/lib/progress.test.ts`
- Modify: `src/lib/schedule.ts`
- Modify: `src/lib/schedule.test.ts`
- Modify: `src/hooks/useSchedule.ts`
- Modify: `src/hooks/useSchedule.test.tsx`

- [ ] **Step 1: Write failing behavior tests**

Use `new Set(["2026-07-07"])` to assert that `recalculateSchedule(rows, holidays)` pushes a dependent start past the holiday, `calculateItemProgress(item, today, holidays)` does not advance on it, and `isOverdue(item, today, holidays)` uses the extended finish. In `useSchedule.test.tsx`, initialize `useSchedule(client, holidays)`, edit a dependency-driven row, and assert `client.save` receives `holidays: ["2026-07-07"]`.

- [ ] **Step 2: Verify focused failures**

Run: `npm test -- src/lib/dependencies.test.ts src/lib/progress.test.ts src/lib/schedule.test.ts src/hooks/useSchedule.test.tsx`

Expected: FAIL due to missing holiday parameters and draft field.

- [ ] **Step 3: Thread the holiday set through pure functions**

Use these signatures and pass the set to calendar helpers:

```ts
recalculateSchedule(items: ScheduleItem[], holidays?: HolidaySet): ScheduleItem[]
calculateItemProgress(item: ScheduleItem, today: string, holidays?: HolidaySet): number | null
calculateScheduleProgress(items: ScheduleItem[], today: string, holidays?: HolidaySet): ScheduleProgress
isOverdue(item: ScheduleItem, today?: string, holidays?: HolidaySet): boolean
```

Extend `ScheduleDraft`:

```ts
export interface ScheduleDraft {
  revision: number;
  items: ScheduleItem[];
  assignees: Assignee[];
  holidays: string[];
}
```

Change the hook signature to `useSchedule(client = scheduleClient, holidays: HolidaySet = new Set())`, include holidays in `applyDraft` dependencies, call `recalculateSchedule(next, holidays)`, and send `holidays: [...holidays].sort()` in `client.save`.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/lib/dependencies.test.ts src/lib/progress.test.ts src/lib/schedule.test.ts src/hooks/useSchedule.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/lib/dependencies.ts src/lib/dependencies.test.ts src/lib/progress.ts src/lib/progress.test.ts src/lib/schedule.ts src/lib/schedule.test.ts src/hooks/useSchedule.ts src/hooks/useSchedule.test.tsx
git commit -m "feat: apply holidays to schedule calculations"
```

### Task 4: Keep server-side dependency validation consistent

**Files:**
- Modify: `functions/lib/validation.ts`
- Modify: `functions/lib/validation.test.ts`
- Modify: `functions/api/schedule.ts`
- Modify: `tests/api.test.ts`

- [ ] **Step 1: Add failing validation and API tests**

Add a validation test whose predecessor would finish on `2026-07-07`, submit `holidays: ["2026-07-07", "bad", "2026-07-07"]`, and expect the dependent start to move to `2026-07-08` with returned holidays normalized to `["2026-07-07"]`. Add an API PUT assertion proving the persisted/returned dependent date uses the submitted normalized holiday.

- [ ] **Step 2: Verify server tests fail**

Run: `npm test -- functions/lib/validation.test.ts tests/api.test.ts`

Expected: FAIL because validation ignores holidays.

- [ ] **Step 3: Normalize holidays before authoritative recalculation**

Import `normalizeHolidays` into validation, normalize `value.holidays`, call `recalculateSchedule(items, holidays)`, and return:

```ts
return {
  revision: Number(value.revision),
  items: recalculated,
  assignees,
  holidays: [...holidays].sort(),
};
```

No database migration is needed: holidays remain deployment configuration and are used only to make server recalculation match the active browser configuration.

- [ ] **Step 4: Run server tests**

Run: `npm test -- functions/lib/validation.test.ts tests/api.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/lib/validation.ts functions/lib/validation.test.ts functions/api/schedule.ts tests/api.test.ts
git commit -m "feat: validate schedules with configured holidays"
```

### Task 5: Wire holidays into the application and Gantt UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/components/ScheduleGrid.tsx`
- Modify: `src/components/ScheduleGrid.test.tsx`
- Modify: `src/components/GanttTimeline.tsx`
- Modify: `src/components/GanttTimeline.test.tsx`

- [ ] **Step 1: Add failing integration and rendering tests**

Update fetch mocks to return a holiday array for `/holidays.json`. Assert a holiday header and cell receive class `weekend`, a bar skips the holiday while ending one calendar day later, the displayed completion date moves accordingly, and application progress does not advance on the holiday.

- [ ] **Step 2: Verify UI tests fail**

Run: `npm test -- src/components/GanttTimeline.test.tsx src/components/ScheduleGrid.test.tsx src/App.test.tsx`

Expected: FAIL because holidays are not passed into UI calculations.

- [ ] **Step 3: Wire one holiday set from App through all consumers**

In `App`, call `const holidays = useHolidays()` before `useSchedule(undefined, holidays)`. Pass it into `buildTimelineDays`, `calculateScheduleProgress`, and `ScheduleGrid` and include it in memo dependencies.

Add `holidays: HolidaySet` to grid props. Pass it to `addWorkingDays`, `calculateItemProgress`, `isOverdue`, `GanttDayHeaders`, and `GanttCells`, including removed/comparison rows. In Gantt components, use `isNonWorkingDay(day, holidays)` for the existing `weekend` CSS class and pass holidays to finish-date calculations.

- [ ] **Step 4: Run UI tests**

Run: `npm test -- src/components/GanttTimeline.test.tsx src/components/ScheduleGrid.test.tsx src/App.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/components/ScheduleGrid.tsx src/components/ScheduleGrid.test.tsx src/components/GanttTimeline.tsx src/components/GanttTimeline.test.tsx
git commit -m "feat: show additional holidays in gantt"
```

### Task 6: Document and verify the complete feature

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document manual configuration**

Add a short section explaining that `public/holidays.json` is a JSON array of unique `YYYY-MM-DD` dates, show `[` `"2026-08-24"` `]`, state that invalid entries are ignored, and explain that deployment plus page reload is required after editing.

- [ ] **Step 2: Run all quality checks**

Run: `npm test`

Expected: all Vitest suites pass.

Run: `npm run lint`

Expected: exit code 0 with no lint errors.

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully and copy `holidays.json` into `dist/`.

- [ ] **Step 3: Confirm only intended files remain**

Run: `git status --short`

Expected: only `README.md` is uncommitted at this point.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md
git commit -m "docs: explain holiday configuration"
```

- [ ] **Step 5: Confirm a clean worktree**

Run: `git status --short`

Expected: no output.
