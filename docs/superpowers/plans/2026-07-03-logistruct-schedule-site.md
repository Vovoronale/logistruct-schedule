# Logistruct Schedule Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished Cloudflare Pages schedule with a public Excel-inspired Gantt view and password-protected D1-backed editing.

**Architecture:** A Vite React client reads a public Pages Functions API and edits a local draft after password authentication. Pages Functions validate signed sessions and complete schedule payloads, then use D1 batch transactions and revision checks to publish atomic updates.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Cloudflare Pages Functions, D1, Wrangler, Playwright.

---

### Task 1: Project scaffold and schedule domain

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.gitignore`
- Create: `src/types.ts`, `src/lib/dates.ts`
- Test: `src/lib/dates.test.ts`

- [ ] **Step 1: Add a failing workday test**

```ts
import { describe, expect, it } from "vitest";
import { addWorkingDays, buildTimelineDays } from "./dates";

describe("addWorkingDays", () => {
  it("skips Saturday and Sunday", () => {
    expect(addWorkingDays("2026-07-03", 2)).toBe("2026-07-07");
  });
  it("returns null for incomplete values", () => {
    expect(addWorkingDays(null, null)).toBeNull();
  });
});

describe("buildTimelineDays", () => {
  it("adds two working-day ranges and calendar padding", () => {
    const days = buildTimelineDays([{ startDate: "2026-07-03", durationDays: 2 }]);
    expect(days[0]).toBe("2026-07-01");
    expect(days.at(-1)).toBe("2026-07-09");
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm install && npm test -- src/lib/dates.test.ts`
Expected: FAIL because `src/lib/dates.ts` does not exist.

- [ ] **Step 3: Implement the typed domain and date helpers**

```ts
export type ScheduleStatus = "planned" | "in_progress" | "completed";
export interface ScheduleItem {
  id: string; position: number; section: string; sheetNumber: number; title: string;
  startDate: string | null; durationDays: number | null; assignee: string | null;
  status: ScheduleStatus; createdAt: string; updatedAt: string;
}
export interface SchedulePayload { items: ScheduleItem[]; revision: number; updatedAt: string; }
```

Implement UTC-safe ISO parsing, `addWorkingDays`, `isWeekend`, `buildTimelineDays`, and Ukrainian compact date formatting in `src/lib/dates.ts`. `durationDays=1` ends on the next working day to preserve the workbook's `WORKDAY.INTL(start, days, 1)` semantics.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- src/lib/dates.test.ts`
Expected: all date tests PASS.

Commit: `git add package.json package-lock.json tsconfig*.json vite.config.ts vitest.config.ts index.html .gitignore src/types.ts src/lib && git commit -m "feat: scaffold schedule domain"`

### Task 2: D1 schema and exact 68-row seed

**Files:**
- Create: `wrangler.jsonc`, `.dev.vars.example`, `migrations/0001_initial.sql`
- Create: `scripts/verify-seed.mjs`
- Test: `tests/seed.test.ts`

- [ ] **Step 1: Write a failing seed test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("initial D1 seed", () => {
  const sql = readFileSync("migrations/0001_initial.sql", "utf8");
  it("contains exactly 68 schedule inserts", () => {
    expect((sql.match(/INSERT INTO schedule_items/g) ?? []).length).toBe(68);
  });
  it("preserves the first and last titles", () => {
    expect(sql).toContain("Заголовний лист. Основні вказівки. Перелік креслень.");
    expect(sql).toContain("План несучих елементів покрівлі над першим поверхом. Вузли. Специфікація.");
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/seed.test.ts`
Expected: FAIL because the migration is absent.

- [ ] **Step 3: Create schema and seed**

Create `schedule_items` with the fields from the design, `schedule_meta` with revision `1`, constraints for status and positive sheet/duration values, and 68 explicit parameter-free seed inserts copied from the approved workbook list. Use stable IDs `drawing-001` through `drawing-068` and positions `1` through `68`.

- [ ] **Step 4: Verify seed and commit**

Run: `npm test -- tests/seed.test.ts`
Expected: PASS with 68 inserts.

Commit: `git add wrangler.jsonc .dev.vars.example migrations scripts tests/seed.test.ts && git commit -m "feat: seed schedule database"`

### Task 3: Authentication and API validation

**Files:**
- Create: `functions/lib/types.ts`, `functions/lib/http.ts`, `functions/lib/auth.ts`, `functions/lib/validation.ts`
- Test: `functions/lib/auth.test.ts`, `functions/lib/validation.test.ts`

- [ ] **Step 1: Write failing auth and validation tests**

```ts
const badItem = {
  id: "duplicate", position: 1, section: "КЗ-0", sheetNumber: 1,
  title: "Test", startDate: null, durationDays: 0, assignee: null,
  status: "planned", createdAt: "2026-07-03T00:00:00Z", updatedAt: "2026-07-03T00:00:00Z",
};
it("accepts an unexpired signed session", async () => {
  const cookie = await createSessionCookie("secret", 1_000);
  expect(await verifySessionCookie(cookie, "secret", 1_001)).toBe(true);
});
it("rejects duplicate ids and invalid durations", () => {
  expect(() => validateSchedule({ revision: 1, items: [badItem, badItem] })).toThrow();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- functions/lib/auth.test.ts functions/lib/validation.test.ts`
Expected: FAIL because authentication and validation helpers do not exist.

- [ ] **Step 3: Implement helpers**

Use Web Crypto HMAC-SHA256 over a base64url JSON payload `{ exp }`, constant-time byte comparison, a 12-hour secure cookie, JSON response helpers, a 128 KiB body cap, and schedule validation that trims strings, normalizes positions, limits the schedule to 1,000 items, accepts only three statuses, and rejects invalid ISO dates or non-positive integers.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- functions/lib/auth.test.ts functions/lib/validation.test.ts`
Expected: PASS.

Commit: `git add functions/lib && git commit -m "feat: add secure schedule validation"`

### Task 4: Pages Functions API

**Files:**
- Create: `functions/api/schedule.ts`
- Create: `functions/api/auth/login.ts`, `functions/api/auth/logout.ts`, `functions/api/auth/session.ts`
- Create: `tests/helpers/mock-context.ts`
- Test: `tests/api.test.ts`

- [ ] **Step 1: Write failing route tests**

```ts
import { mockContext } from "./helpers/mock-context";

it("allows public schedule reads", async () => {
  const response = await onRequestGet(mockContext());
  expect(response.status).toBe(200);
});
it("rejects an unauthenticated schedule save", async () => {
  const response = await onRequestPut(mockContext({ cookie: "" }));
  expect(response.status).toBe(401);
});
it("returns 409 for a stale revision", async () => {
  const response = await onRequestPut(mockContext({ revision: 0, authenticated: true }));
  expect(response.status).toBe(409);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/api.test.ts`
Expected: FAIL because the routes are absent.

- [ ] **Step 3: Implement API routes**

Map D1 snake_case rows to the shared payload shape. The PUT route reads and checks the current revision, validates the full payload, deletes and reinserts rows with parameterized statements, updates metadata, and executes all statements through `DB.batch`. Login compares the configured password without logging it and sets the signed cookie. Logout expires it; session reports `{ authenticated: boolean }`.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- tests/api.test.ts`
Expected: all API tests PASS.

Commit: `git add functions tests/api.test.ts && git commit -m "feat: implement schedule API"`

### Task 5: Client state, filtering, and edit workflow

**Files:**
- Create: `src/lib/api.ts`, `src/lib/colors.ts`, `src/lib/schedule.ts`
- Create: `src/hooks/useSchedule.ts`
- Test: `src/lib/schedule.test.ts`, `src/hooks/useSchedule.test.tsx`

- [ ] **Step 1: Write failing client tests**

```ts
const client = createFakeScheduleClient({ saveError: new Error("offline") });
it("filters title case-insensitively and combines section/status filters", () => {
  expect(filterItems(items, { query: "ферма", section: "КМ2", assignee: "", status: "planned" })).toHaveLength(4);
});
it("retains a dirty draft when save fails", async () => {
  const { result } = renderHook(() => useSchedule(client));
  act(() => result.current.updateItem("drawing-001", { title: "Змінено" }));
  await act(() => result.current.save());
  expect(result.current.isDirty).toBe(true);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/lib/schedule.test.ts src/hooks/useSchedule.test.tsx`
Expected: FAIL because the client modules are absent.

- [ ] **Step 3: Implement client state**

Implement API error types including revision conflicts, immutable draft updates, add/delete/reorder helpers, filters, status labels, assignee colors copied from the design, deterministic fallback colors, and a hook that loads public data, checks sessions, logs in/out, saves drafts, cancels edits, and preserves dirty state on errors.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- src/lib/schedule.test.ts src/hooks/useSchedule.test.tsx`
Expected: PASS.

Commit: `git add src/lib src/hooks && git commit -m "feat: add schedule editor state"`

### Task 6: Polished table and Gantt interface

**Files:**
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles.css`
- Create: `src/components/AppHeader.tsx`, `FilterBar.tsx`, `ScheduleGrid.tsx`, `GanttTimeline.tsx`, `LoginDialog.tsx`, `EditActions.tsx`, `Toast.tsx`
- Test: `src/App.test.tsx`, `src/components/ScheduleGrid.test.tsx`

- [ ] **Step 1: Write failing UI tests**

```tsx
it("renders the useful schedule columns and no technical columns", async () => {
  render(<App />);
  expect(await screen.findByText("Найменування креслення")).toBeVisible();
  expect(screen.queryByText("К-ть залежностей")).not.toBeInTheDocument();
});
it("shows edit actions only after authentication", async () => {
  render(<App />);
  expect(screen.queryByText("Додати рядок")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/App.test.tsx src/components/ScheduleGrid.test.tsx`
Expected: FAIL because the UI components are absent.

- [ ] **Step 3: Build the interface**

Create the sticky-header spreadsheet layout, frozen identifying columns, synchronized Gantt rows, month/day headers, weekend shading, assignee legend, colored bars, filters, password dialog, inline editor controls, row move buttons and drag handles, delete confirmation, loading/error/empty states, toast feedback, and unsaved-change warning. Use only CSS and small inline SVG icons; do not add a generic component framework.

- [ ] **Step 4: Verify UI and commit**

Run: `npm test -- src/App.test.tsx src/components/ScheduleGrid.test.tsx && npm run build`
Expected: UI tests PASS and Vite exits 0 with `dist/` output.

Commit: `git add src && git commit -m "feat: build schedule gantt interface"`

### Task 7: Browser verification and deployment documentation

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/schedule.spec.ts`
- Create: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Add the browser acceptance test**

```ts
test("public schedule and administrator edit flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Графік креслень/ })).toBeVisible();
  await expect(page.getByText("Заголовний лист. Основні вказівки. Перелік креслень.")).toBeVisible();
  await page.getByRole("button", { name: "Редагувати" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
```

- [ ] **Step 2: Document Cloudflare setup**

Document `npm install`, `npm run dev`, `npm test`, `npm run build`, D1 creation, migration commands, Pages D1 binding named `DB`, `ADMIN_PASSWORD` and `SESSION_SECRET` secrets, Git-based Pages deployment, and Wrangler direct deployment. Ensure `.dev.vars` remains ignored.

- [ ] **Step 3: Run the full verification suite**

Run: `npm test && npm run build && npm run lint && npm run test:e2e`
Expected: every command exits 0 with no failing tests or type errors.

- [ ] **Step 4: Review repository state and commit**

Run: `git diff --check && git status --short`
Expected: only intended site, test, migration, and documentation files are modified; the workbook remains untracked and unchanged.

Commit: `git add README.md package.json package-lock.json playwright.config.ts tests/e2e && git commit -m "docs: add Pages deployment workflow"`
