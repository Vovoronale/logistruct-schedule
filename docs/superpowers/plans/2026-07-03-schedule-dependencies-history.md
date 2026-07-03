# Schedule Dependencies, Today Marker, and History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add stable multi-predecessor scheduling, cascading dates, today/past Gantt styling, dependency-chain analysis, and comparison with any of the ten previous saved schedule versions.

**Architecture:** Keep stable item IDs as the persisted dependency identity while resolving current row positions only at the UI boundary. Put graph calculation and snapshot comparison in pure client/server-shared modules, keep normalized live dependencies in D1, and retain outgoing full-state JSON snapshots for history. The server remains authoritative for graph validation and derived dates; React performs the same calculation for immediate draft feedback.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest and Testing Library, Cloudflare Pages Functions, Cloudflare D1.

---

## File Map

- Create migrations/0003_dependencies_history.sql for live dependencies, start mode, and snapshots.
- Modify src/types.ts for scheduling, history, and comparison contracts.
- Create src/lib/dependencies.ts and its test for graph validation, dates, delete guards, and traversal.
- Create src/lib/comparison.ts and its test for stable-ID snapshot diffs.
- Modify functions/lib/validation.ts and its test for authoritative graph validation.
- Create functions/lib/schedule-storage.ts and its test for normalized D1 mapping and snapshots.
- Modify functions/api/schedule.ts and tests/api.test.ts for atomic snapshot saves.
- Create functions/api/schedule/history.ts and functions/api/schedule/history/[revision].ts.
- Modify src/lib/api.ts and create its test for history client methods.
- Modify src/hooks/useSchedule.ts and its test for dependency-aware drafts and history state.
- Create src/components/DependencyEditor.tsx and its test.
- Create src/components/ScheduleModes.tsx and its test.
- Modify ScheduleGrid, GanttTimeline, App, styles, and their tests for visualization.
- Modify README.md for operations and deployment.

### Task 1: Extend Shared Types and D1 Schema

**Files:**
- Create: migrations/0003_dependencies_history.sql
- Modify: tests/seed.test.ts
- Modify: src/types.ts

- [ ] **Step 1: Add a failing migration contract test**

Append to tests/seed.test.ts:

~~~ts
it("adds stable dependencies and history storage", () => {
  const sql = readFileSync(
    new URL("../migrations/0003_dependencies_history.sql", import.meta.url),
    "utf8",
  );
  expect(sql).toContain("ADD COLUMN start_mode");
  expect(sql).toContain("CREATE TABLE item_dependencies");
  expect(sql).toContain("CREATE TABLE schedule_history");
  expect(sql).toContain("ON DELETE RESTRICT");
});
~~~

- [ ] **Step 2: Run the test and verify RED**

Run: npx vitest run tests/seed.test.ts

Expected: FAIL because migration 0003 does not exist.

- [ ] **Step 3: Add the migration**

Create migrations/0003_dependencies_history.sql:

~~~sql
ALTER TABLE schedule_items
ADD COLUMN start_mode TEXT NOT NULL DEFAULT 'manual'
CHECK (start_mode IN ('manual', 'dependencies'));

CREATE TABLE item_dependencies (
  item_id TEXT NOT NULL,
  predecessor_id TEXT NOT NULL,
  PRIMARY KEY (item_id, predecessor_id),
  CHECK (item_id <> predecessor_id),
  FOREIGN KEY (item_id) REFERENCES schedule_items(id) ON DELETE CASCADE,
  FOREIGN KEY (predecessor_id) REFERENCES schedule_items(id) ON DELETE RESTRICT
);

CREATE INDEX item_dependencies_predecessor_idx
ON item_dependencies(predecessor_id);

CREATE TABLE schedule_history (
  revision INTEGER PRIMARY KEY CHECK (revision >= 1),
  saved_at TEXT NOT NULL,
  snapshot_json TEXT NOT NULL
);
~~~

- [ ] **Step 4: Add the shared contracts**

Update src/types.ts:

~~~ts
export type ScheduleStartMode = "manual" | "dependencies";

export interface ScheduleItem {
  id: string;
  position: number;
  section: string;
  sheetNumber: number;
  title: string;
  startMode: ScheduleStartMode;
  startDate: string | null;
  durationDays: number | null;
  predecessorIds: string[];
  assignee: string | null;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleHistoryEntry {
  revision: number;
  savedAt: string;
}

export interface ScheduleHistorySnapshot extends SchedulePayload {}

export type ComparableItemField =
  | "position" | "section" | "sheetNumber" | "title" | "startMode"
  | "startDate" | "durationDays" | "predecessorIds" | "assignee" | "status";

export interface ItemComparison {
  id: string;
  fields: ComparableItemField[];
}

export interface ScheduleComparison {
  addedIds: string[];
  removedItems: ScheduleItem[];
  changed: ItemComparison[];
  rescheduledIds: string[];
}
~~~

Add startMode: "manual" and predecessorIds: [] to every typed ScheduleItem fixture.

- [ ] **Step 5: Verify GREEN and commit**

Run: npx vitest run tests/seed.test.ts && npm run typecheck

Expected: PASS.

~~~powershell
git add migrations/0003_dependencies_history.sql tests/seed.test.ts src/types.ts
git commit -m "feat: add dependency and history schema"
~~~

### Task 2: Build the Dependency Graph Engine

**Files:**
- Create: src/lib/dependencies.ts
- Create: src/lib/dependencies.test.ts

- [ ] **Step 1: Write failing graph tests**

Create src/lib/dependencies.test.ts:

~~~ts
import { describe, expect, it } from "vitest";
import type { ScheduleItem } from "../types";
import {
  DependencyError,
  dependencyRelations,
  directDependentIds,
  recalculateSchedule,
} from "./dependencies";

const item = (id: string, position: number, patch: Partial<ScheduleItem> = {}): ScheduleItem => ({
  id,
  position,
  section: "КЗ",
  sheetNumber: position,
  title: id,
  startMode: "manual",
  startDate: "2026-07-06",
  durationDays: 1,
  predecessorIds: [],
  assignee: null,
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
  ...patch,
});

describe("recalculateSchedule", () => {
  it("uses the latest finish and cascades through successors", () => {
    const result = recalculateSchedule([
      item("a", 1, { durationDays: 2 }),
      item("b", 2, { durationDays: 4 }),
      item("c", 3, { startMode: "dependencies", startDate: null, predecessorIds: ["a", "b"] }),
      item("d", 4, { startMode: "dependencies", startDate: null, predecessorIds: ["c"] }),
    ]);
    expect(result.find((row) => row.id === "c")?.startDate).toBe("2026-07-10");
    expect(result.find((row) => row.id === "d")?.startDate).toBe("2026-07-13");
  });

  it("rejects a cycle", () => {
    expect(() => recalculateSchedule([
      item("a", 1, { startMode: "dependencies", predecessorIds: ["b"] }),
      item("b", 2, { startMode: "dependencies", predecessorIds: ["a"] }),
    ])).toThrow(DependencyError);
  });

  it("collects transitive relations and direct blockers", () => {
    const rows = [
      item("a", 1),
      item("b", 2, { startMode: "dependencies", predecessorIds: ["a"] }),
      item("c", 3, { startMode: "dependencies", predecessorIds: ["b"] }),
    ];
    expect(dependencyRelations(rows, "b")).toEqual({
      predecessors: new Set(["a"]),
      successors: new Set(["c"]),
    });
    expect(directDependentIds(rows, "a")).toEqual(["b"]);
  });
});
~~~

- [ ] **Step 2: Verify RED**

Run: npx vitest run src/lib/dependencies.test.ts

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement strict graph calculation**

Create src/lib/dependencies.ts:

~~~ts
import type { ScheduleItem } from "../types";
import { addWorkingDays } from "./dates";

export class DependencyError extends Error {
  constructor(message: string, readonly itemId: string) {
    super(message);
    this.name = "DependencyError";
  }
}

export function recalculateSchedule(items: ScheduleItem[]): ScheduleItem[] {
  const rows = new Map(items.map((row) => [
    row.id,
    { ...row, predecessorIds: [...row.predecessorIds] },
  ]));
  const state = new Map<string, "visiting" | "done">();

  const visit = (id: string): ScheduleItem => {
    const row = rows.get(id);
    if (!row) throw new DependencyError("Не знайдено пов’язану роботу", id);
    if (state.get(id) === "visiting") {
      throw new DependencyError("Виявлено цикл залежностей", id);
    }
    if (state.get(id) === "done") return row;
    state.set(id, "visiting");

    const unique = new Set(row.predecessorIds);
    if (unique.size !== row.predecessorIds.length) {
      throw new DependencyError("Залежності не можуть повторюватися", id);
    }
    if (row.startMode === "manual" && row.predecessorIds.length > 0) {
      throw new DependencyError("Ручна дата не може містити залежності", id);
    }
    if (row.startMode === "dependencies") {
      if (row.predecessorIds.length === 0) {
        throw new DependencyError("Оберіть хоча б одну попередню роботу", id);
      }
      const finishes = row.predecessorIds.map((predecessorId) => {
        if (predecessorId === id) {
          throw new DependencyError("Робота не може залежати від себе", id);
        }
        const predecessor = visit(predecessorId);
        const finish = addWorkingDays(predecessor.startDate, predecessor.durationDays);
        if (!finish) {
          throw new DependencyError("Попередня робота не має дати завершення", id);
        }
        return finish;
      });
      row.startDate = finishes.sort().at(-1) ?? null;
    }
    state.set(id, "done");
    return row;
  };

  for (const row of items) visit(row.id);
  return items.map((row) => rows.get(row.id)!);
}

export function directDependentIds(items: ScheduleItem[], targetId: string): string[] {
  return items.filter((row) => row.predecessorIds.includes(targetId)).map((row) => row.id);
}

export function dependencyRelations(items: ScheduleItem[], selectedId: string) {
  const byId = new Map(items.map((row) => [row.id, row]));
  const successors = new Map<string, string[]>();
  for (const row of items) {
    for (const predecessorId of row.predecessorIds) {
      successors.set(predecessorId, [...(successors.get(predecessorId) ?? []), row.id]);
    }
  }
  const collect = (seed: string[], next: (id: string) => string[]) => {
    const found = new Set<string>();
    const queue = [...seed];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (found.has(id)) continue;
      found.add(id);
      queue.push(...next(id));
    }
    found.delete(selectedId);
    return found;
  };
  return {
    predecessors: collect(byId.get(selectedId)?.predecessorIds ?? [], (id) => byId.get(id)?.predecessorIds ?? []),
    successors: collect(successors.get(selectedId) ?? [], (id) => successors.get(id) ?? []),
  };
}
~~~

- [ ] **Step 4: Add boundary tests**

Append explicit cases:

~~~ts
it.each([
  ["self dependency", [
    item("a", 1, { startMode: "dependencies", predecessorIds: ["a"] }),
  ]],
  ["duplicate edge", [
    item("a", 1),
    item("b", 2, { startMode: "dependencies", predecessorIds: ["a", "a"] }),
  ]],
  ["missing predecessor", [
    item("a", 1, { startMode: "dependencies", predecessorIds: ["missing"] }),
  ]],
  ["manual row with edge", [
    item("a", 1),
    item("b", 2, { predecessorIds: ["a"] }),
  ]],
  ["dependency mode without edges", [
    item("a", 1, { startMode: "dependencies", predecessorIds: [] }),
  ]],
  ["predecessor without finish", [
    item("a", 1, { durationDays: null }),
    item("b", 2, { startMode: "dependencies", predecessorIds: ["a"] }),
  ]],
])("rejects %s", (_name, rows) => {
  expect(() => recalculateSchedule(rows)).toThrow(DependencyError);
});

it("moves a successor from Friday completion to Monday", () => {
  const result = recalculateSchedule([
    item("a", 1, { startDate: "2026-07-09", durationDays: 1 }),
    item("b", 2, { startMode: "dependencies", predecessorIds: ["a"] }),
  ]);
  expect(result[1].startDate).toBe("2026-07-10");
  expect(addWorkingDays(result[1].startDate, 1)).toBe("2026-07-13");
});
~~~

- [ ] **Step 5: Verify and commit**

Run: npx vitest run src/lib/dependencies.test.ts && npm test

Expected: PASS.

~~~powershell
git add src/lib/dependencies.ts src/lib/dependencies.test.ts
git commit -m "feat: calculate schedule dependencies"
~~~

### Task 3: Build Stable-ID Version Comparison

**Files:**
- Create: src/lib/comparison.ts
- Create: src/lib/comparison.test.ts

- [ ] **Step 1: Write a failing comparison test**

~~~ts
it("matches by stable id and classifies changes", () => {
  const previous = [row("removed"), row("kept", { position: 1 })];
  const current = [row("kept", { position: 2, startDate: "2026-07-08" }), row("added")];
  expect(compareSchedules(current, previous)).toMatchObject({
    addedIds: ["added"],
    removedItems: [{ id: "removed" }],
    changed: [{ id: "kept", fields: ["position", "startDate"] }],
    rescheduledIds: ["kept"],
  });
});
~~~

The row helper must return a complete ScheduleItem, including startMode and predecessorIds.

- [ ] **Step 2: Verify RED**

Run: npx vitest run src/lib/comparison.test.ts

Expected: FAIL because compareSchedules is missing.

- [ ] **Step 3: Implement comparison**

Create src/lib/comparison.ts:

~~~ts
import type {
  ComparableItemField,
  ScheduleComparison,
  ScheduleItem,
} from "../types";

const FIELDS: ComparableItemField[] = [
  "position", "section", "sheetNumber", "title", "startMode", "startDate",
  "durationDays", "predecessorIds", "assignee", "status",
];
const SCHEDULE_FIELDS = new Set<ComparableItemField>([
  "position", "startMode", "startDate", "durationDays", "predecessorIds",
]);

const equal = (field: ComparableItemField, a: ScheduleItem, b: ScheduleItem) =>
  field === "predecessorIds"
    ? [...a.predecessorIds].sort().join("\0") === [...b.predecessorIds].sort().join("\0")
    : a[field] === b[field];

export function compareSchedules(
  current: ScheduleItem[],
  previous: ScheduleItem[],
): ScheduleComparison {
  const currentById = new Map(current.map((row) => [row.id, row]));
  const previousById = new Map(previous.map((row) => [row.id, row]));
  const changed = current.flatMap((row) => {
    const old = previousById.get(row.id);
    if (!old) return [];
    const fields = FIELDS.filter((field) => !equal(field, row, old));
    return fields.length > 0 ? [{ id: row.id, fields }] : [];
  });
  return {
    addedIds: current.filter((row) => !previousById.has(row.id)).map((row) => row.id),
    removedItems: previous.filter((row) => !currentById.has(row.id)),
    changed,
    rescheduledIds: changed
      .filter((entry) => entry.fields.some((field) => SCHEDULE_FIELDS.has(field)))
      .map((entry) => entry.id),
  };
}
~~~

- [ ] **Step 4: Add tests for order-insensitive dependency IDs and field-only changes**

Append:

~~~ts
it("treats dependency order as insignificant", () => {
  const previous = [row("x", { predecessorIds: ["a", "b"] })];
  const current = [row("x", { predecessorIds: ["b", "a"] })];
  expect(compareSchedules(current, previous).changed).toEqual([]);
});

it("does not classify a title-only edit as rescheduling", () => {
  const result = compareSchedules(
    [row("x", { title: "Нова назва" })],
    [row("x", { title: "Стара назва" })],
  );
  expect(result.changed).toEqual([{ id: "x", fields: ["title"] }]);
  expect(result.rescheduledIds).toEqual([]);
});
~~~

- [ ] **Step 5: Verify and commit**

Run: npx vitest run src/lib/comparison.test.ts && npm run typecheck

Expected: PASS.

~~~powershell
git add src/lib/comparison.ts src/lib/comparison.test.ts
git commit -m "feat: compare schedule revisions"
~~~

### Task 4: Validate and Recalculate Dependency Payloads on the Server

**Files:**
- Modify: functions/lib/validation.ts
- Modify: functions/lib/validation.test.ts

- [ ] **Step 1: Add failing validation tests**

~~~ts
it("recalculates a dependency date instead of trusting submitted data", () => {
  const result = validateScheduleDraft({
    revision: 2,
    assignees: [],
    items: [
      { ...validItem, id: "a", startDate: "2026-07-06", durationDays: 2 },
      {
        ...validItem,
        id: "b",
        startMode: "dependencies",
        startDate: "2030-01-01",
        predecessorIds: ["a"],
      },
    ],
  });
  expect(result.items[1].startDate).toBe("2026-07-08");
});

it("reports cycles against an affected row", () => {
  expect(() => validateScheduleDraft({
    revision: 2,
    assignees: [],
    items: [
      { ...validItem, id: "a", startMode: "dependencies", predecessorIds: ["b"] },
      { ...validItem, id: "b", startMode: "dependencies", predecessorIds: ["a"] },
    ],
  })).toThrow("Виявлено цикл залежностей");
});
~~~

- [ ] **Step 2: Verify RED**

Run: npx vitest run functions/lib/validation.test.ts

Expected: FAIL because dependency fields are not parsed or recalculated.

- [ ] **Step 3: Parse new fields**

Import ScheduleStartMode, DependencyError, and recalculateSchedule. Add:

~~~ts
const START_MODES = new Set<ScheduleStartMode>(["manual", "dependencies"]);

function predecessorIds(value: unknown, row: number): string[] {
  if (!Array.isArray(value) || value.length > 1_000) {
    throw new ValidationError("Некоректний список залежностей", row, "predecessorIds");
  }
  return value.map((id) => {
    if (typeof id !== "string" || !ID.test(id)) {
      throw new ValidationError("Некоректна пов’язана робота", row, "predecessorIds");
    }
    return id;
  });
}
~~~

Validate startMode against START_MODES and add both fields to validateItem.

- [ ] **Step 4: Recalculate after all IDs are known**

After duplicate-ID validation:

~~~ts
let recalculated: ScheduleItem[];
try {
  recalculated = recalculateSchedule(items);
} catch (error) {
  if (!(error instanceof DependencyError)) throw error;
  const row = items.findIndex((item) => item.id === error.itemId) + 1;
  throw new ValidationError(error.message, row || undefined, "predecessorIds");
}
return { revision: Number(value.revision), items: recalculated, assignees };
~~~

- [ ] **Step 5: Verify and commit**

Run: npx vitest run functions/lib/validation.test.ts && npm test

Expected: PASS.

~~~powershell
git add functions/lib/validation.ts functions/lib/validation.test.ts
git commit -m "feat: validate dependency graphs on save"
~~~

### Task 5: Extract Schedule Storage Mapping

**Files:**
- Create: functions/lib/schedule-storage.ts
- Create: functions/lib/schedule-storage.test.ts
- Modify: functions/api/schedule.ts

- [ ] **Step 1: Write failing storage tests**

Create a D1 fake and verify normalized edges are grouped:

~~~ts
const payload = await readSchedule(fakeDb({
  meta: { revision: 3, updated_at: "2026-07-03T10:00:00Z" },
  items: [itemRow("a"), itemRow("b", "dependencies")],
  dependencies: [{ item_id: "b", predecessor_id: "a" }],
  assignees: [],
}) as never);
expect(payload.items[1].predecessorIds).toEqual(["a"]);
expect(() => parseSnapshot("{broken")).toThrow("INVALID_HISTORY_SNAPSHOT");
~~~

- [ ] **Step 2: Verify RED**

Run: npx vitest run functions/lib/schedule-storage.test.ts

Expected: FAIL because the module is missing.

- [ ] **Step 3: Extract and extend the reader**

Move the row interfaces and mapping logic from functions/api/schedule.ts. Query metadata, items, assignees, and dependencies in parallel. Map each item with startMode: row.start_mode and predecessorIds from a Map grouped by item_id.

Export:

~~~ts
export async function readSchedule(db: D1Database): Promise<SchedulePayload>;
export function parseSnapshot(snapshotJson: string): ScheduleHistorySnapshot;
~~~

parseSnapshot must parse JSON, confirm an integer revision, string updatedAt, and arrays items and assignees, otherwise throw Error("INVALID_HISTORY_SNAPSHOT").

- [ ] **Step 4: Switch the active API to the shared reader**

Remove the duplicated private mapping from functions/api/schedule.ts and import readSchedule from ../lib/schedule-storage.

- [ ] **Step 5: Verify and commit**

Run: npx vitest run functions/lib/schedule-storage.test.ts tests/api.test.ts && npm run typecheck

Expected: PASS.

~~~powershell
git add functions/lib/schedule-storage.ts functions/lib/schedule-storage.test.ts functions/api/schedule.ts
git commit -m "refactor: share schedule storage mapping"
~~~

### Task 6: Save History and Dependencies Atomically

**Files:**
- Modify: functions/api/schedule.ts
- Modify: tests/api.test.ts

- [ ] **Step 1: Add a recording D1 batch fake and a failing save test**

Record SQL and bound values. Assert one batch contains:

~~~ts
expect(executedSql).toEqual(expect.arrayContaining([
  expect.stringContaining("INSERT OR REPLACE INTO schedule_history"),
  expect.stringContaining("DELETE FROM item_dependencies"),
  expect.stringContaining("INSERT INTO item_dependencies"),
  expect.stringContaining("DELETE FROM schedule_history"),
]));
expect(batchCallCount).toBe(1);
expect(JSON.parse(historySnapshotJson)).toMatchObject({ revision: 1 });
~~~

Also assert the response uses a server-recalculated dependent date.

- [ ] **Step 2: Verify RED**

Run: npx vitest run tests/api.test.ts

Expected: FAIL because saves do not persist snapshots or edges.

- [ ] **Step 3: Build one dependency-safe D1 batch**

Read currentSchedule before validation. Submit statements in this exact order:

1. guarded metadata revision update;
2. insert outgoing currentSchedule JSON into schedule_history;
3. delete item_dependencies;
4. delete schedule_items;
5. delete assignees;
6. insert assignees;
7. insert recalculated items including start_mode;
8. insert every item_id/predecessor_id edge;
9. prune snapshots:

~~~sql
DELETE FROM schedule_history
WHERE revision NOT IN (
  SELECT revision FROM schedule_history
  ORDER BY revision DESC
  LIMIT 10
)
~~~

Return the recalculated items with revision + 1 and the new updatedAt.

- [ ] **Step 4: Test failure atomicity**

Make batch reject, then assert the response is 500 and the fake committed state is unchanged.

Seed the fake with revisions 1 through 11, execute the real prune statement in the fake batch, and assert:

~~~ts
expect(committedHistory.map((entry) => entry.revision)).toEqual([
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
]);
~~~

- [ ] **Step 5: Verify and commit**

Run: npx vitest run tests/api.test.ts && npm test

Expected: PASS.

~~~powershell
git add functions/api/schedule.ts tests/api.test.ts
git commit -m "feat: snapshot schedule history on save"
~~~

### Task 7: Add History Endpoints and Client Methods

**Files:**
- Create: functions/api/schedule/history.ts
- Create: functions/api/schedule/history/[revision].ts
- Modify: tests/api.test.ts
- Modify: src/lib/api.ts
- Create: src/lib/api.test.ts

- [ ] **Step 1: Add failing route tests**

Verify newest-first metadata, successful snapshot retrieval, invalid revision 400, absent revision 404, and malformed snapshot 500.

~~~ts
await expect(historyResponse.json()).resolves.toEqual([
  { revision: 7, savedAt: "2026-07-03T12:00:00Z" },
  { revision: 6, savedAt: "2026-07-03T11:00:00Z" },
]);
await expect(snapshotResponse.json()).resolves.toMatchObject({
  revision: 6,
  items: [],
  assignees: [],
});
~~~

- [ ] **Step 2: Verify RED**

Run: npx vitest run tests/api.test.ts

Expected: FAIL because the route modules are missing.

- [ ] **Step 3: Implement public routes**

Metadata route query:

~~~sql
SELECT revision, saved_at
FROM schedule_history
ORDER BY revision DESC
LIMIT 10
~~~

Snapshot route accepts only a positive integer params.revision and queries:

~~~sql
SELECT snapshot_json
FROM schedule_history
WHERE revision = ?
~~~

Use parseSnapshot; return generic Ukrainian 500 errors without leaking stored JSON.

- [ ] **Step 4: Add failing client tests**

Stub fetch and assert scheduleClient.getHistory() requests /api/schedule/history and getHistoryRevision(6) requests /api/schedule/history/6.

- [ ] **Step 5: Add client methods**

Extend ScheduleClient:

~~~ts
getHistory(): Promise<ScheduleHistoryEntry[]>;
getHistoryRevision(revision: number): Promise<ScheduleHistorySnapshot>;
~~~

Implement:

~~~ts
getHistory: () => requestJson<ScheduleHistoryEntry[]>("/api/schedule/history"),
getHistoryRevision: (revision) =>
  requestJson<ScheduleHistorySnapshot>(
    "/api/schedule/history/" + encodeURIComponent(String(revision)),
  ),
~~~

- [ ] **Step 6: Verify and commit**

Run: npx vitest run tests/api.test.ts src/lib/api.test.ts && npm run typecheck

Expected: PASS.

~~~powershell
git add functions/api/schedule/history.ts functions/api/schedule/history/[revision].ts tests/api.test.ts src/lib/api.ts src/lib/api.test.ts
git commit -m "feat: expose schedule history"
~~~

### Task 8: Add Dependency-Aware Hook State

**Files:**
- Modify: src/hooks/useSchedule.ts
- Modify: src/hooks/useSchedule.test.tsx

- [ ] **Step 1: Write failing hook tests**

Test cascade, reorder stability, delete blocking, cycle errors, and invalid-save blocking:

~~~ts
act(() => result.current.updateItem("a", { durationDays: 4 }));
expect(result.current.items.find((row) => row.id === "b")?.startDate).toBe("2026-07-10");

act(() => result.current.reorderItem("a", "b"));
expect(result.current.items.find((row) => row.id === "b")?.predecessorIds).toEqual(["a"]);

expect(result.current.removeItem("a")).toBe(false);
expect(result.current.error).toContain("№");
~~~

- [ ] **Step 2: Verify RED**

Run: npx vitest run src/hooks/useSchedule.test.tsx

Expected: FAIL because draft mutations ignore the graph.

- [ ] **Step 3: Centralize draft graph application**

Add dependencyError state and:

~~~ts
const applyDraft = useCallback((next: ScheduleItem[]) => {
  try {
    setDraftItems(recalculateSchedule(next));
    setDependencyError(null);
  } catch (error) {
    setDraftItems(next);
    setDependencyError(error instanceof DependencyError
      ? { itemId: error.itemId, message: error.message }
      : { itemId: "", message: "Не вдалося перерахувати залежності" });
  }
  setIsDirty(true);
}, []);
~~~

Route update, reorder, move, and valid deletion through applyDraft. Before deletion, resolve directDependentIds to current row positions and return false with a Ukrainian message when blockers exist. New rows use manual mode and an empty predecessor array. Expose canSave: isDirty && !dependencyError and reject save while invalid.

- [ ] **Step 4: Add history state**

Expose history, historyLoading, historyError, comparisonSnapshot, loadHistory(), selectHistoryRevision(revision), and clearComparison(). A history failure must not discard saved. Clear comparison on edit start, logout, reload, or save.

- [ ] **Step 5: Verify and commit**

Run: npx vitest run src/hooks/useSchedule.test.tsx && npm test

Expected: PASS.

~~~powershell
git add src/hooks/useSchedule.ts src/hooks/useSchedule.test.tsx
git commit -m "feat: manage dependency-aware drafts"
~~~

### Task 9: Add Dependency Editing and Analysis UI

**Files:**
- Create: src/components/DependencyEditor.tsx
- Create: src/components/DependencyEditor.test.tsx
- Create: src/components/ScheduleModes.tsx
- Create: src/components/ScheduleModes.test.tsx
- Modify: src/components/ScheduleGrid.tsx
- Modify: src/components/EditActions.tsx
- Modify: src/App.tsx
- Modify: src/App.test.tsx
- Modify: src/styles.css

- [ ] **Step 1: Write failing editor tests**

Verify mode switching, stable-ID checkbox output, current number chips, chip renumbering after rerender, and clearing edges on manual mode:

~~~ts
expect(screen.getByRole("button", { name: "№2" })).toBeVisible();
rerender(<DependencyEditor {...props} items={reorderedItems} />);
expect(screen.getByRole("button", { name: "№1" })).toBeVisible();
~~~

- [ ] **Step 2: Verify RED**

Run: npx vitest run src/components/DependencyEditor.test.tsx

Expected: FAIL because the component is missing.

- [ ] **Step 3: Implement DependencyEditor**

Use:

~~~ts
interface DependencyEditorProps {
  item: ScheduleItem;
  items: ScheduleItem[];
  error?: string;
  onChange: (patch: Partial<ScheduleItem>) => void;
}
~~~

Render a manual/dependencies select, a details-based multi-checkbox picker sorted by position and labeled with number plus title, removable number chips, and a row error with role alert. Omit the current item. Mode changes emit:

~~~ts
onChange(nextMode === "manual"
  ? { startMode: "manual", predecessorIds: [] }
  : { startMode: "dependencies", startDate: null, predecessorIds: [] });
~~~

- [ ] **Step 4: Add the table column and analysis action**

Add allItems: ScheduleItem[] separately from the existing filtered items prop, and pass schedule.items from App so dependency choices are never restricted by table filters. Insert Початок за before Початок. In view mode show Датою or number chips. Add a button named Показати залежності для роботи №N.

Assign:

~~~ts
const relationClass =
  item.id === selectedAnalysisId ? "dependency-selected"
  : predecessors.has(item.id) ? "dependency-predecessor"
  : successors.has(item.id) ? "dependency-successor"
  : selectedAnalysisId ? "dependency-unrelated"
  : "";
~~~

- [ ] **Step 5: Integrate graph analysis**

In App, store selectedAnalysisId, compute dependencyRelations over all unfiltered items, and pass relation sets to ScheduleGrid. ScheduleModes renders the selected/predecessor/successor legend and clear action. Filtering does not change traversal.

- [ ] **Step 6: Test and style**

Add the three-level interaction assertion:

~~~ts
await user.click(screen.getByRole("button", {
  name: "Показати залежності для роботи №2",
}));
expect(screen.getByTestId("schedule-row-a")).toHaveClass("dependency-predecessor");
expect(screen.getByTestId("schedule-row-b")).toHaveClass("dependency-selected");
expect(screen.getByTestId("schedule-row-c")).toHaveClass("dependency-successor");
await user.click(screen.getByRole("button", { name: "Очистити підсвічування" }));
expect(screen.getByTestId("schedule-row-a")).not.toHaveClass("dependency-predecessor");
~~~

Disable save through schedule.canSave. Add these concrete style roles, retaining the existing palette variables:

~~~css
.dependency-selected { outline: 2px solid #0f56d9; outline-offset: -2px; }
.dependency-predecessor .row-number { box-shadow: inset 4px 0 #8064a2; }
.dependency-successor .row-number { box-shadow: inset 4px 0 #ed7d31; }
.dependency-unrelated { opacity: .38; }
.dependency-chip { border: 1px solid #9db4d5; border-radius: 999px; background: #edf4ff; }
~~~

- [ ] **Step 7: Verify and commit**

Run: npx vitest run src/components/DependencyEditor.test.tsx src/components/ScheduleModes.test.tsx src/App.test.tsx && npm run typecheck

Expected: PASS.

~~~powershell
git add src/components/DependencyEditor.tsx src/components/DependencyEditor.test.tsx src/components/ScheduleModes.tsx src/components/ScheduleModes.test.tsx src/components/ScheduleGrid.tsx src/components/EditActions.tsx src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat: edit and inspect dependencies"
~~~

### Task 10: Add Today and Past Timeline Styling

**Files:**
- Modify: src/lib/dates.ts
- Modify: src/lib/dates.test.ts
- Modify: src/components/GanttTimeline.tsx
- Create: src/components/GanttTimeline.test.tsx
- Modify: src/components/ScheduleGrid.tsx
- Modify: src/styles.css

- [ ] **Step 1: Write failing range tests**

~~~ts
it("includes today even when work is later", () => {
  const days = buildTimelineDays(
    [{ startDate: "2026-08-03", durationDays: 2 }],
    "2026-07-03",
  );
  expect(days).toContain("2026-07-03");
  expect(days).toContain("2026-08-05");
});

it("shows a today range when no work is dated", () => {
  expect(buildTimelineDays([], "2026-07-03")).toEqual([
    "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05",
  ]);
});
~~~

- [ ] **Step 2: Verify RED**

Run: npx vitest run src/lib/dates.test.ts

Expected: FAIL because today is not a bound.

- [ ] **Step 3: Include today in buildTimelineDays**

Use:

~~~ts
export function buildTimelineDays(
  items: TimelineSource[],
  today = todayIso(),
): string[]
~~~

Initialize earliest and latest from parsed today, expand with valid work bounds, and retain two-day padding.

- [ ] **Step 4: Write failing Gantt tests**

Freeze today at 2026-07-08. Assert today classes/label, past classes, gray active past segments, and assignee-colored current/future segments.

- [ ] **Step 5: Implement semantic classes and colors**

Pass today to Gantt headers/cells:

~~~ts
const dateClass = day === today ? "today" : day < today ? "past" : "";
const barStyle = day < today
  ? { backgroundColor: "#A8B0BC", color: "#FFFFFF" }
  : { backgroundColor: color, color: textColor };
~~~

Set data-today="true" and aria-label="Сьогодні" on the current header. Add a strong vertical pseudo-element for today and muted past styles.

- [ ] **Step 6: Center today once**

Use a scroller ref and a one-time guard:

~~~ts
scroller.scrollLeft = Math.max(
  0,
  todayCell.offsetLeft - scroller.clientWidth / 2 + todayCell.clientWidth / 2,
);
~~~

Do not steal focus or recenter after user scrolling.

- [ ] **Step 7: Verify and commit**

Run: npx vitest run src/lib/dates.test.ts src/components/GanttTimeline.test.tsx && npm test

Expected: PASS.

~~~powershell
git add src/lib/dates.ts src/lib/dates.test.ts src/components/GanttTimeline.tsx src/components/GanttTimeline.test.tsx src/components/ScheduleGrid.tsx src/styles.css
git commit -m "feat: mark today on the gantt timeline"
~~~

### Task 11: Add Revision Comparison UI

**Files:**
- Modify: src/components/ScheduleModes.tsx
- Modify: src/components/ScheduleModes.test.tsx
- Modify: src/components/GanttTimeline.tsx
- Modify: src/components/GanttTimeline.test.tsx
- Modify: src/components/ScheduleGrid.tsx
- Modify: src/App.tsx
- Modify: src/App.test.tsx
- Modify: src/styles.css

- [ ] **Step 1: Write failing comparison control tests**

Test metadata loading, revision/date labels, selecting revision 4, loading/error announcements, summary counts, and closing comparison.

- [ ] **Step 2: Verify RED**

Run: npx vitest run src/components/ScheduleModes.test.tsx

Expected: FAIL because history controls are absent.

- [ ] **Step 3: Implement comparison state and mutual exclusion**

In App:

~~~ts
const comparison = schedule.comparisonSnapshot
  ? compareSchedules(schedule.saved?.items ?? [], schedule.comparisonSnapshot.items)
  : null;
~~~

Opening comparison while editing is disabled with guidance to save or cancel. Selecting a revision clears dependency analysis. Selecting dependency analysis clears comparison.

When comparison is active, build the timeline from both versions so an older bar outside the current date bounds remains visible:

~~~ts
const timelineItems = schedule.comparisonSnapshot
  ? [...schedule.items, ...schedule.comparisonSnapshot.items]
  : schedule.items;
const timelineDays = buildTimelineDays(timelineItems);
~~~

- [ ] **Step 4: Mark changed, added, and removed rows**

Pass comparison and historical items into ScheduleGrid. Add changed-cell only when its field appears in ItemComparison.fields and title the cell with its formatted prior value. Mark added rows with comparison-added. Render removed snapshot items in a separate removed-items tbody with prior values, no drag/edit controls, and a visible Видалено state.

- [ ] **Step 5: Add historical ghost bars**

Extend GanttCells with previousItem and render before the current bar:

~~~tsx
{wasActive ? (
  <span
    className="gantt-bar historical-bar"
    aria-label={"Попередня версія: " + previousItem.title}
  />
) : null}
~~~

Test that a shifted item renders historical and current segments at different dates.

- [ ] **Step 6: Add App integration tests and styles**

Stub fetch by URL and assert the complete path:

~~~ts
await user.click(screen.getByRole("button", { name: "Порівняти" }));
await user.selectOptions(
  await screen.findByLabelText("Версія для порівняння"),
  "4",
);
expect(await screen.findByText("Додано: 1")).toBeVisible();
expect(screen.getByText("Видалено: 1")).toBeVisible();
expect(screen.getByTitle(/Було:/)).toBeVisible();
expect(screen.getByLabelText(/Попередня версія:/)).toBeVisible();
expect(screen.getByText("Видалено", { selector: ".removed-items *" })).toBeVisible();
await user.click(screen.getByRole("button", { name: "Закрити порівняння" }));
expect(screen.queryByLabelText(/Попередня версія:/)).not.toBeInTheDocument();
~~~

Add these styles:

~~~css
.historical-bar {
  z-index: 0;
  border: 2px dashed #5f6f84;
  background: rgba(255, 255, 255, .55);
}
.comparison-added .row-number { box-shadow: inset 4px 0 #2f8a46; }
.removed-items td { color: #8f3030; background: #fff1f1 !important; }
.changed-cell { position: relative; }
.changed-cell::after {
  content: "";
  position: absolute;
  right: 2px;
  top: 2px;
  border: 4px solid transparent;
  border-top-color: #d58a00;
  border-right-color: #d58a00;
}
~~~

- [ ] **Step 7: Verify and commit**

Run: npx vitest run src/components/ScheduleModes.test.tsx src/components/GanttTimeline.test.tsx src/App.test.tsx && npm test

Expected: PASS.

~~~powershell
git add src/components/ScheduleModes.tsx src/components/ScheduleModes.test.tsx src/components/GanttTimeline.tsx src/components/GanttTimeline.test.tsx src/components/ScheduleGrid.tsx src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat: compare retained schedule revisions"
~~~

### Task 12: Document, Migrate, and Verify

**Files:**
- Modify: README.md

- [ ] **Step 1: Update README**

Document manual/dependency scheduling, stable number selection backed by IDs, deletion and cycle restrictions, dependency analysis colors, today/past styling, ten-version comparison, and:

~~~powershell
npx wrangler d1 migrations apply logistruct-schedule-db --remote
npm run deploy
~~~

- [ ] **Step 2: Apply local migration**

Run: npx wrangler d1 migrations apply logistruct-schedule-db --local

Expected: 0003 applies successfully; rerunning reports no migrations to apply.

- [ ] **Step 3: Run automated verification**

~~~powershell
npm test
npm run lint
npm run build
~~~

Expected: all commands exit 0 with no failures, warnings that indicate defects, lint errors, or type errors.

- [ ] **Step 4: Run browser verification**

Start npm run dev:cf and use the Browser skill on the local URL. Verify:

1. today is centered and vertically marked;
2. past cells are muted and past bar segments gray;
3. multiple predecessor numbers can be selected;
4. an upstream duration cascades through two successor levels;
5. reordering renumbers chips without breaking links;
6. self-links and cycles block saving;
7. referenced deletion is blocked with dependent numbers;
8. analysis distinguishes ancestors, selection, descendants, and unrelated rows;
9. after 11 saves only 10 previous revisions remain;
10. comparison shows ghost bars, changed cells, additions, and removals;
11. analysis and comparison are mutually exclusive;
12. the table and dialogs remain usable at 390 px width.

- [ ] **Step 5: Commit documentation**

Run: git status --short

Expected: only files listed in this plan are modified, apart from pre-existing user-owned untracked files.

~~~powershell
git add README.md
git commit -m "docs: explain dependencies and history"
~~~

- [ ] **Step 6: Final clean verification**

~~~powershell
git status --short
npm test
npm run lint
npm run build
~~~

Expected: only pre-existing user-owned untracked files remain, and all checks exit 0.
