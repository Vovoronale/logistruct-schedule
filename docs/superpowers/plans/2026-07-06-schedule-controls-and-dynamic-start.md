# Schedule Controls And Dynamic Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add richer schedule controls: multi-select filters, column sorting, dependency-picker confirmation, assignee free-day counts, dynamic today fallback for missing start dates, and clearer save blockers.

**Architecture:** Keep behavior client-side in React/Vite. Shared date/schedule helpers own derived dates, filtering, sorting, and assignee availability; components render controls and call existing update callbacks.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS.

## Global Constraints

- Use existing component patterns and avoid unrelated refactors.
- Add failing tests before implementation for behavior changes.
- Do not stage unrelated user changes.
- Commit and push to `main` only after verification.

---

### Task 1: Dynamic Dates And Assignee Availability

**Files:**
- Modify: `src/lib/dates.ts`
- Modify: `src/lib/progress.ts`
- Modify: `src/components/GanttTimeline.tsx`
- Modify: `src/components/AssigneeLegend.tsx`
- Test: `src/lib/dates.test.ts`
- Test: `src/lib/progress.test.ts`
- Test: `src/components/AssigneeLegend.test.tsx`

**Interfaces:**
- Produces: `effectiveStartDate(startDate: string | null, today?: string): string`
- Produces: `workingDaysBetween(startValue: string, endValue: string, holidays?: HolidaySet): string[]`
- Produces: `assigneeFreeDays(items, assigneeName, targetDate, today, holidays): number`

- [x] Write failing tests for null start dates using today in progress/timeline.
- [x] Write failing tests for assignee free-day counts to a selected date.
- [x] Implement helpers and update components.
- [x] Run relevant tests.

### Task 2: Multi-Select Filters And Sorting

**Files:**
- Modify: `src/lib/schedule.ts`
- Modify: `src/components/WorkspaceToolbar.tsx`
- Modify: `src/components/FilterBar.tsx`
- Modify: `src/components/ScheduleGrid.tsx`
- Test: `src/lib/schedule.test.ts`
- Test: `src/components/WorkspaceToolbar.test.tsx`
- Test: `src/components/ScheduleGrid.test.tsx`

**Interfaces:**
- Changes: `ScheduleFilters.section`, `assignee`, and `status` become arrays.
- Produces: column sort buttons in `ScheduleGrid`.

- [x] Write failing tests for multi-select filtering.
- [x] Write failing tests for column sort buttons.
- [x] Implement reusable checkbox filter controls and sort helpers.
- [x] Run relevant tests.

### Task 3: Dependency Picker And Save Blockers

**Files:**
- Modify: `src/components/DependencyEditor.tsx`
- Modify: `src/components/EditActions.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/DependencyEditor.test.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Dependency candidates sort same-assignee rows first when current row has an assignee.
- Dependency picker has a final confirmation button that closes the list.
- Save-blocker copy includes the blocking row number when available.

- [x] Write failing tests for dependency sorting and Done button.
- [x] Write failing tests for visible blocking-row reason.
- [x] Implement UI changes.
- [x] Run relevant tests.

### Task 4: Verify, Commit, Push

**Files:**
- All intended changed files only.

- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [ ] Stage intended files explicitly.
- [ ] Commit with a concise imperative message.
- [ ] Push `main` to origin.
