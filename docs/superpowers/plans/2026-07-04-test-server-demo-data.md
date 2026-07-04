# Test Server Demo Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reproducible, isolated Cloudflare Pages test server populated with rich demo data derived from the repository's 68 drawing records.

**Architecture:** A pure ECMAScript module will transform the migrated D1 rows into a deterministic fixture and size-bounded D1 batches. A narrow CLI module will own filesystem safety checks and Wrangler subprocesses, always passing an absolute `.wrangler/test-state` persistence path so the normal local and remote databases remain untouched.

**Tech Stack:** Node.js ESM, Vitest, Cloudflare Wrangler Pages/D1, SQLite SQL, React smoke testing through the in-app browser.

---

## File map

- Create `scripts/test-data.mjs`: pure date helpers, fixture generation, validation, and SQL rendering.
- Create `scripts/test-db.mjs`: safe test-state reset/seed CLI and Wrangler process orchestration.
- Create `tests/test-data.test.ts`: behavior tests for deterministic fixtures, coverage scenarios, graph validity, history, escaping, and protected paths.
- Modify `package.json`: expose `db:test:reset`, `db:test:seed`, and `dev:test`.
- Modify `README.md`: document the isolated test workflow and safety boundary.

### Task 1: Pure fixture generator

**Files:**
- Create: `tests/test-data.test.ts`
- Create: `scripts/test-data.mjs`

- [ ] **Step 1: Write failing fixture-profile tests**

Create 68 base rows and 17 assignee rows in `tests/test-data.test.ts`, then assert the observable profile:

```ts
import { describe, expect, it } from "vitest";
import {
  createDemoFixture,
  validateFixture,
} from "../scripts/test-data.mjs";

const baseItems = Array.from({ length: 68 }, (_, index) => ({
  id: `drawing-${String(index + 1).padStart(3, "0")}`,
  position: index + 1,
  section: index < 34 ? "КЗ" : "КМ",
  sheet_number: index + 1,
  title: `Креслення ${index + 1}`,
  start_mode: "manual",
  start_date: null,
  duration_days: null,
  assignee: null,
  status: "planned",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
}));

const assignees = Array.from({ length: 17 }, (_, index) => ({
  id: `assignee-${index + 1}`,
  name: `Виконавець ${index + 1}`,
  color: "#00B050",
  position: index + 1,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
}));

describe("createDemoFixture", () => {
  it("creates a deterministic comprehensive profile", () => {
    const fixture = createDemoFixture(baseItems, assignees, "2026-07-04");
    expect(fixture.items).toHaveLength(68);
    expect(new Set(fixture.items.map((item) => item.status))).toEqual(
      new Set(["planned", "in_progress", "completed"]),
    );
    expect(new Set(fixture.items.map((item) => item.assignee).filter(Boolean)))
      .toEqual(new Set(assignees.map((assignee) => assignee.name)));
    expect(fixture.items.some((item) => item.startDate === null)).toBe(true);
    expect(fixture.dependencies.length).toBeGreaterThan(10);
    expect(fixture.history).toHaveLength(3);
    expect(fixture.revision).toBe(5);
    expect(() => validateFixture(fixture)).not.toThrow();
    expect(createDemoFixture(baseItems, assignees, "2026-07-04"))
      .toEqual(fixture);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/test-data.test.ts`

Expected: FAIL because `scripts/test-data.mjs` does not exist.

- [ ] **Step 3: Implement date helpers and fixture generation**

In `scripts/test-data.mjs`, implement UTC-only date helpers and export the fixture API:

```js
const DAY_MS = 86_400_000;

function parseDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) {
    throw new Error(`INVALID_DATE:${isoDate}`);
  }
  return date;
}

export function addCalendarDays(isoDate, days) {
  return new Date(parseDate(isoDate).getTime() + days * DAY_MS)
    .toISOString().slice(0, 10);
}

export function addWorkingDays(isoDate, days) {
  let cursor = parseDate(isoDate);
  let remaining = days;
  while (remaining > 0) {
    cursor = new Date(cursor.getTime() + DAY_MS);
    if (![0, 6].includes(cursor.getUTCDay())) remaining -= 1;
  }
  return cursor.toISOString().slice(0, 10);
}
```

Use the fixed status bands `1..17 completed`, `18..34 in_progress`, `35..60 planned with dates`, and `61..68 planned without dates`. Cycle all 17 assignee names through items `1..60`, use durations `[1, 2, 3, 5, 8, 10]`, and place manual dates before/around/after the anchor.

Create these lower-to-higher-position dependency edges so the graph is acyclic and contains chains, branches, and joins:

```js
const DEPENDENCY_PAIRS = [
  ["drawing-019", "drawing-018"],
  ["drawing-020", "drawing-019"],
  ["drawing-021", "drawing-019"],
  ["drawing-022", "drawing-020"],
  ["drawing-022", "drawing-021"],
  ["drawing-050", "drawing-049"],
  ["drawing-051", "drawing-050"],
  ["drawing-052", "drawing-050"],
  ["drawing-053", "drawing-051"],
  ["drawing-053", "drawing-052"],
  ["drawing-054", "drawing-053"],
  ["drawing-063", "drawing-061"],
  ["drawing-063", "drawing-062"],
  ["drawing-064", "drawing-063"],
];
```

For dependency-mode items, compute `startDate` from the latest predecessor finish using working days. Build revisions 2, 3, and 4 by cloning the current payload, altering dates/status/assignee, omitting `drawing-068`, and including a synthetic `test-removed-001` only in history. Set the current revision to 5.

- [ ] **Step 4: Add graph and history assertions**

Extend `tests/test-data.test.ts` with assertions that every dependency points to an existing earlier-position item, `drawing-022` and `drawing-053` each have two predecessors, revision 2 omits `drawing-068`, revision 2 contains `test-removed-001`, and every snapshot includes 17 assignees.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- tests/test-data.test.ts`

Expected: all fixture tests pass.

- [ ] **Step 6: Commit the generator**

```powershell
git add scripts/test-data.mjs tests/test-data.test.ts
git commit -m "feat: generate comprehensive test schedule data"
```

### Task 2: Transactional SQL and protected CLI

**Files:**
- Modify: `tests/test-data.test.ts`
- Modify: `scripts/test-data.mjs`
- Create: `scripts/test-db.mjs`

- [ ] **Step 1: Write failing SQL and path-safety tests**

Add tests that import `renderFixtureSql` from `scripts/test-data.mjs` and `assertSafeTestStatePath` from `scripts/test-db.mjs`:

```ts
it("renders idempotent D1 batches with escaped snapshots", () => {
  const fixture = createDemoFixture(baseItems, assignees, "2026-07-04");
  fixture.items[0].title = "Креслення з 'апострофом'";
  const sql = renderFixtureSql(fixture);
  expect(sql).not.toContain("BEGIN IMMEDIATE;");
  expect(sql).not.toContain("COMMIT;");
  expect(sql).toContain("DELETE FROM item_dependencies;");
  expect(sql).toContain("DELETE FROM schedule_history;");
  expect(sql).toContain("Креслення з ''апострофом''");
  expect(sql.trim().endsWith(";")).toBe(true);
});

it("only accepts the repository test-state directory", () => {
  const root = "C:\\repo";
  expect(() => assertSafeTestStatePath(root, "C:\\repo\\.wrangler\\test-state"))
    .not.toThrow();
  expect(() => assertSafeTestStatePath(root, "C:\\repo\\.wrangler\\state"))
    .toThrow("UNSAFE_TEST_STATE_PATH");
  expect(() => assertSafeTestStatePath(root, "C:\\outside"))
    .toThrow("UNSAFE_TEST_STATE_PATH");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/test-data.test.ts`

Expected: FAIL because SQL rendering and CLI path validation are missing.

- [ ] **Step 3: Implement SQL serialization**

Add `sqlString(value)`, `renderFixtureSql(fixture)`, and `renderFixtureSqlChunks(fixture, maxBytes)` to `scripts/test-data.mjs`. Wrangler sends each file as an implicit transactional D1 batch, so generated SQL must not contain unsupported manual `BEGIN` or `COMMIT`. Each batch must stay below 80 KB and the ordered statements must:

1. Delete existing dependencies and history.
2. Update exactly the 68 migrated rows with fixture values.
3. Insert all normalized dependency pairs.
4. Insert revisions 2, 3, and 4 with complete JSON payloads.
5. Update `schedule_meta` to revision 5 and the fixture timestamp.
6. Commit atomically.

Escape every SQL string by replacing `'` with `''`; render nulls as `NULL` and integers without quotes.

- [ ] **Step 4: Implement the isolated database CLI**

In `scripts/test-db.mjs`:

```js
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createDemoFixture, renderFixtureSql } from "./test-data.mjs";

export function assertSafeTestStatePath(root, candidate) {
  if (resolve(candidate) !== resolve(root, ".wrangler", "test-state")) {
    throw new Error("UNSAFE_TEST_STATE_PATH");
  }
}
```

The CLI accepts only `reset` or `seed`. It resolves the repository root from `import.meta.url`, always passes `--local --persist-to <absolute-test-state>`, runs migrations first, queries the 68 base rows and 17 assignees using `wrangler d1 execute --json`, validates the returned counts/IDs, writes SQL to an OS temporary directory, executes it with `--file`, and removes the temporary directory in `finally`. `reset` first removes only the validated test-state directory; `seed` preserves the directory and replaces only fixture-controlled tables/columns.

- [ ] **Step 5: Run focused tests and lint**

Run: `npm test -- tests/test-data.test.ts`

Expected: all focused tests pass.

Run: `npm run lint`

Expected: ESLint exits 0.

- [ ] **Step 6: Commit SQL and CLI support**

```powershell
git add scripts/test-data.mjs scripts/test-db.mjs tests/test-data.test.ts
git commit -m "feat: seed an isolated local test database"
```

### Task 3: Commands, documentation, and end-to-end verification

**Files:**
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Add package commands**

Add these scripts to `package.json`:

```json
"db:test:reset": "node scripts/test-db.mjs reset",
"db:test:seed": "node scripts/test-db.mjs seed",
"dev:test": "npm run build && wrangler pages dev dist --ip 127.0.0.1 --port 8788 --persist-to .wrangler/test-state"
```

- [ ] **Step 2: Document the test server workflow**

Add a `## Тестовий сервер` section to `README.md` explaining:

```powershell
npm run db:test:reset
npm run dev:test
```

State explicitly that `.wrangler/test-state` is separate from `.wrangler/state`, `db:test:reset` deletes only the test state, and rerunning `npm run db:test:seed` restores the fixture without deleting the database.

- [ ] **Step 3: Run the complete automated verification**

Run: `npm test`

Expected: all existing and new Vitest files pass.

Run: `npm run lint`

Expected: ESLint exits 0.

Run: `npm run build`

Expected: TypeScript and Vite production build exit 0.

- [ ] **Step 4: Reset and inspect the isolated D1 database**

Run: `npm run db:test:reset`

Expected: all migrations apply under `.wrangler/test-state` and the fixture seed succeeds.

Run a local D1 query against the same persistence path confirming: 68 items; nonzero counts for all three statuses; 17 distinct non-null assignees represented; 14 dependency edges; 3 history rows; current revision 5.

- [ ] **Step 5: Prove the normal local D1 database was untouched**

Query `.wrangler/state` before and after the isolated reset and compare `schedule_meta.revision`, item count, dependency count, and history count. Expected: all values remain identical.

- [ ] **Step 6: Start and smoke-test the test server**

Run `npm run dev:test` as a hidden background process and wait for `http://127.0.0.1:8788` to return HTTP 200. In the in-app browser verify:

- page title is `Графік випуску креслень`;
- 68 rows load and no framework overlay appears;
- console has no relevant warnings/errors;
- searching for `Ферма Ф-4` reduces the table to one row;
- filtering to `Завершено` shows a nonzero strict subset;
- dependency analysis opens for a dependency-mode item;
- comparison loads revisions and selecting one shows changed/add/remove evidence.

Keep the server running for the user after validation.

- [ ] **Step 7: Commit commands and docs**

```powershell
git add package.json README.md
git commit -m "docs: add isolated test server workflow"
```

- [ ] **Step 8: Final repository check**

Run: `git status --short --branch`

Expected: branch `main` with no tracked or untracked changes; `.wrangler/test-state` remains ignored.
