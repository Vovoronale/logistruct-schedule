# Assignee Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Додати адміністратору довідник виконавців із редагуванням назв і кольорів, який атомарно зберігається разом із графіком.

**Architecture:** D1-таблиця `assignees` стає джерелом назв і кольорів. `GET` і `PUT /api/schedule` передають рядки та довідник одним payload; React тримає обидва набори у спільній чернетці, а окремий `AssigneeDialog` застосовує локально перевірені зміни.

**Tech Stack:** React 19, TypeScript, Vitest/Testing Library, Cloudflare Pages Functions, D1, CSS.

---

## File map

- Create `migrations/0002_assignees.sql` — таблиця та початкова Excel-палітра.
- Modify `src/types.ts` — тип `Assignee` та розширені payload/draft.
- Modify `functions/lib/validation.ts` and test — серверна нормалізація довідника.
- Modify `functions/api/schedule.ts` and `tests/api.test.ts` — читання та атомарне збереження.
- Create `src/lib/assignees.ts` and test — підрахунок використання й застосування перейменувань.
- Modify `src/lib/colors.ts` and test — колір із довідника зі стабільним fallback.
- Modify `src/hooks/useSchedule.ts` and test — спільна чернетка виконавців і рядків.
- Create `src/components/AssigneeDialog.tsx` and test — модальне керування.
- Modify `src/App.tsx`, `EditActions.tsx`, `AssigneeLegend.tsx`, `GanttTimeline.tsx`, `ScheduleGrid.tsx`, `styles.css` — інтеграція UI.
- Modify `README.md` — опис нової можливості та міграції.

### Task 1: D1 schema and shared types

**Files:**
- Create: `migrations/0002_assignees.sql`
- Modify: `src/types.ts`
- Test: `tests/seed.test.ts`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write the failing migration test**

Add to `tests/seed.test.ts`:

```ts
it("creates and seeds the assignee directory", () => {
  const sql = readFileSync("migrations/0002_assignees.sql", "utf8");
  expect(sql).toContain("CREATE TABLE assignees");
  expect((sql.match(/INSERT INTO assignees/g) ?? []).length).toBe(17);
  expect(sql).toContain("#00B050");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/seed.test.ts`
Expected: FAIL because `migrations/0002_assignees.sql` does not exist.

- [ ] **Step 3: Add the schema, seed, and types**

Create `migrations/0002_assignees.sql` with:

```sql
CREATE TABLE assignees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  color TEXT NOT NULL CHECK (color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  position INTEGER NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO assignees VALUES ('assignee-iv', 'ІВ', '#00B050', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-vtk', 'Втк', '#FF9999', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-yev', 'Єв', '#FF99FF', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-ol', 'Ол', '#FFCC66', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-my', 'Ми', '#66FFFF', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-ro', 'Ро', '#CCFF66', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-va', 'Ва', '#00B0F0', 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-ih', 'Іг', '#FFFF99', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-na', 'На', '#538DD5', 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-vta', 'Вта', '#BFBFBF', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-tr', 'Тр', '#92D050', 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-vv', 'Вв', '#948A54', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-ai', 'Ай', '#DA9694', 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-yul', 'Юл', '#FABF8F', 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-oo', 'Оо', '#B1A0C7', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-tn', 'Тн', '#FFC000', 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO assignees VALUES ('assignee-sv', 'Св', '#76933C', 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

Add to `src/types.ts` and extend both schedule interfaces:

```ts
export interface Assignee {
  id: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulePayload {
  items: ScheduleItem[];
  assignees: Assignee[];
  revision: number;
  updatedAt: string;
}

export interface ScheduleDraft {
  revision: number;
  items: ScheduleItem[];
  assignees: Assignee[];
}
```

Update the typed `SchedulePayload` fixture in `src/App.test.tsx` with `assignees: []`. This keeps the repository type-safe while later tasks add populated directory cases.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- tests/seed.test.ts && npm run typecheck`
Expected: seed test and typecheck pass.

- [ ] **Step 5: Commit**

```powershell
git add migrations/0002_assignees.sql src/types.ts tests/seed.test.ts src/App.test.tsx
git commit -m "feat: add assignee directory schema"
```

### Task 2: Validate assignee drafts

**Files:**
- Modify: `functions/lib/validation.ts`
- Modify: `functions/lib/validation.test.ts`

- [ ] **Step 1: Write failing validation tests**

Add fixtures with `assignees: []`, then tests:

```ts
const person = (name: string, id = "person-1", color = "#00B050"): Assignee => ({
  id, name, color, position: 1,
  createdAt: validItem.createdAt,
  updatedAt: validItem.updatedAt,
});

it("normalizes assignee names and colors", () => {
  const result = validateScheduleDraft({
    revision: 2,
    items: [validItem],
    assignees: [{
      id: "person-1", name: "  ІВ  ", color: "#00b050", position: 9,
      createdAt: validItem.createdAt, updatedAt: validItem.updatedAt,
    }],
  });
  expect(result.assignees[0]).toMatchObject({ name: "ІВ", color: "#00B050", position: 1 });
});

it("rejects duplicate names ignoring case", () => {
  expect(() => validateScheduleDraft({
    revision: 2, items: [], assignees: [person("ІВ"), person("ів", "person-2")],
  })).toThrow("Назви виконавців не можуть повторюватися");
});

it("rejects invalid colors", () => {
  expect(() => validateScheduleDraft({
    revision: 2, items: [], assignees: [person("ІВ", "person-1", "green")],
  })).toThrow("Колір має бути у форматі #RRGGBB");
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- functions/lib/validation.test.ts`
Expected: FAIL because `assignees` are not validated or returned.

- [ ] **Step 3: Implement minimal validation**

Add `HEX_COLOR`, `validateAssignee`, uniqueness checks, and return value:

```ts
const HEX_COLOR = /^#[0-9A-F]{6}$/iu;

function validateAssignee(value: unknown, index: number): Assignee {
  const row = index + 1;
  if (!isRecord(value)) throw new ValidationError("Некоректний виконавець", row);
  const color = requiredText(value.color, row, "color", 7).toUpperCase();
  if (!HEX_COLOR.test(color)) {
    throw new ValidationError("Колір має бути у форматі #RRGGBB", row, "color");
  }
  return {
    id: requiredText(value.id, row, "id", 100),
    name: requiredText(value.name, row, "name", 24),
    color,
    position: row,
    createdAt: timestamp(value.createdAt, row, "createdAt"),
    updatedAt: timestamp(value.updatedAt, row, "updatedAt"),
  };
}
```

Inside `validateScheduleDraft`, require at most 200 entries, validate IDs and case-folded names, then return:

```ts
const assignees = value.assignees.map(validateAssignee);
const names = new Set<string>();
for (const [index, assignee] of assignees.entries()) {
  const key = assignee.name.toLocaleLowerCase("uk-UA");
  if (names.has(key)) {
    throw new ValidationError("Назви виконавців не можуть повторюватися", index + 1, "name");
  }
  names.add(key);
}
return { revision: Number(value.revision), items, assignees };
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- functions/lib/validation.test.ts`
Expected: all validation tests pass.

- [ ] **Step 5: Commit**

```powershell
git add functions/lib/validation.ts functions/lib/validation.test.ts
git commit -m "feat: validate assignee directory"
```

### Task 3: Read and atomically save assignees in the API

**Files:**
- Modify: `functions/api/schedule.ts`
- Modify: `tests/api.test.ts`

- [ ] **Step 1: Write failing API tests**

Extend the D1 fake to return assignee rows and assert:

```ts
// Add `assigneeRows?: Record<string, unknown>[]` to createContext options.
// In `all()`, return this collection when the SQL reads FROM assignees.
if (sql.includes("FROM assignees")) {
  return { results: options?.assigneeRows ?? [], success: true, meta: {} };
}

it("returns the public assignee directory", async () => {
  const response = await onRequestGet(createContext({
    assigneeRows: [{
      id: "person-1", name: "ІВ", color: "#00B050", position: 1,
      created_at: "2026-07-03T00:00:00Z", updated_at: "2026-07-03T00:00:00Z",
    }],
  }) as never);
  expect(await response.json()).toMatchObject({
    assignees: [{ id: "person-1", name: "ІВ", color: "#00B050", position: 1 }],
  });
});

it("rejects removal of an assignee still used by a drawing", async () => {
  const token = await createSessionToken("a-secret-long-enough-for-tests");
  const request = new Request("https://example.com/api/schedule", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: `logistruct_session=${token}` },
    body: JSON.stringify({
      revision: 1,
      items: [{
        id: "drawing-001", position: 1, section: "КЗ-0", sheetNumber: 1,
        title: "Заголовний лист", startDate: null, durationDays: null,
        assignee: "ІВ", status: "planned",
        createdAt: "2026-07-03T00:00:00Z", updatedAt: "2026-07-03T00:00:00Z",
      }],
      assignees: [],
    }),
  });
  const response = await onRequestPut(createContext({
    request,
    assigneeRows: [{ name: "ІВ" }],
  }) as never);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: "Спочатку замініть виконавця ІВ у кресленнях" });
});
```

Import `createSessionToken` from `functions/lib/auth.ts` in this test file.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/api.test.ts`
Expected: FAIL because GET omits `assignees` and PUT does not enforce used removals.

- [ ] **Step 3: Implement API mapping and save batch**

Add `AssigneeRow`, `mapAssignee`, and the third parallel query:

```ts
db.prepare(`SELECT id, name, color, position, created_at, updated_at
            FROM assignees ORDER BY position ASC`).all<AssigneeRow>()
```

Return `assignees: assigneeRows.results.map(mapAssignee)`. Before the batch, load current names and reject only removed configured names still referenced by draft items:

```ts
const nextNames = new Set(draft.assignees.map((person) => person.name));
for (const existing of currentAssignees.results) {
  if (!nextNames.has(existing.name) && draft.items.some((item) => item.assignee === existing.name)) {
    throw new ValidationError(`Спочатку замініть виконавця ${existing.name} у кресленнях`, undefined, "assignees");
  }
}
```

Add `DELETE FROM assignees`, prepared inserts, and order the atomic batch as update meta, delete items, delete assignees, insert assignees, insert items. Return both arrays with refreshed `updatedAt`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- tests/api.test.ts && npm run typecheck`
Expected: API tests pass; remaining type errors are limited to frontend fixtures addressed next.

- [ ] **Step 5: Commit**

```powershell
git add functions/api/schedule.ts tests/api.test.ts
git commit -m "feat: persist assignee directory"
```

### Task 4: Assignee domain helpers and editor state

**Files:**
- Create: `src/lib/assignees.ts`
- Create: `src/lib/assignees.test.ts`
- Modify: `src/lib/colors.ts`
- Modify: `src/lib/colors.test.ts`
- Modify: `src/hooks/useSchedule.ts`
- Create: `src/hooks/useSchedule.test.tsx`
- Modify: existing schedule fixtures in `src/App.test.tsx` and API client tests

- [ ] **Step 1: Write failing helper and hook tests**

```ts
const person = (name: string, color = "#00B050"): Assignee => ({
  id: "person-1", name, color, position: 1,
  createdAt: "2026-07-03T00:00:00Z", updatedAt: "2026-07-03T00:00:00Z",
});
const itemsWith = (name: string): ScheduleItem[] => [{
  id: "drawing-001", position: 1, section: "КЗ-0", sheetNumber: 1,
  title: "Заголовний лист", startDate: null, durationDays: null,
  assignee: name, status: "planned",
  createdAt: "2026-07-03T00:00:00Z", updatedAt: "2026-07-03T00:00:00Z",
}];

it("renames every matching drawing assignment by stable person id", () => {
  expect(applyAssigneeChanges(itemsWith("ІВ"), [person("ІВ")], [person("Ірина")]).items[0].assignee)
    .toBe("Ірина");
});

it("reports usage and blocks removing a used person", () => {
  expect(assigneeUsageCount(itemsWith("ІВ"), "ІВ")).toBe(1);
  expect(() => applyAssigneeChanges(itemsWith("ІВ"), [person("ІВ")], []))
    .toThrow("Спочатку замініть виконавця ІВ");
});

it("uses a configured color before the fallback", () => {
  expect(assigneeColor("ІВ", [person("ІВ", "#123456")])).toBe("#123456");
});
```

Hook test: load `assignees`, begin editing, call `replaceAssignees`, and expect renamed item plus dirty state.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/lib/assignees.test.ts src/lib/colors.test.ts src/hooks/useSchedule.test.tsx`
Expected: FAIL because helpers and directory state do not exist.

- [ ] **Step 3: Implement helpers and hook state**

Create focused helpers:

```ts
export function assigneeUsageCount(items: ScheduleItem[], name: string): number {
  return items.filter((item) => item.assignee === name).length;
}

export function applyAssigneeChanges(
  items: ScheduleItem[], current: Assignee[], next: Assignee[],
): { items: ScheduleItem[]; assignees: Assignee[] } {
  const nextIds = new Set(next.map((person) => person.id));
  for (const person of current) {
    if (!nextIds.has(person.id) && assigneeUsageCount(items, person.name) > 0) {
      throw new Error(`Спочатку замініть виконавця ${person.name} у кресленнях`);
    }
  }
  const renamed = new Map(current.flatMap((person) => {
    const replacement = next.find((candidate) => candidate.id === person.id);
    return replacement && replacement.name !== person.name ? [[person.name, replacement.name]] : [];
  }));
  return {
    items: items.map((item) => ({ ...item, assignee: item.assignee ? (renamed.get(item.assignee) ?? item.assignee) : null })),
    assignees: next.map((person, index) => ({ ...person, position: index + 1 })),
  };
}
```

Change `assigneeColor` to accept `Assignee[]`, and in `useSchedule` add `draftAssignees`, derived `assignees`, cloning on load/begin/cancel, `replaceAssignees`, and include `assignees` in `client.save`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- src/lib/assignees.test.ts src/lib/colors.test.ts src/hooks/useSchedule.test.tsx src/App.test.tsx && npm run typecheck`
Expected: all selected tests and typecheck pass.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/assignees.ts src/lib/assignees.test.ts src/lib/colors.ts src/lib/colors.test.ts src/hooks/useSchedule.ts src/hooks/useSchedule.test.tsx src/App.test.tsx
git commit -m "feat: add assignee editor state"
```

### Task 5: Assignee management dialog and UI wiring

**Files:**
- Create: `src/components/AssigneeDialog.tsx`
- Create: `src/components/AssigneeDialog.test.tsx`
- Modify: `src/components/EditActions.tsx`
- Modify: `src/components/AssigneeLegend.tsx`
- Modify: `src/components/GanttTimeline.tsx`
- Modify: `src/components/ScheduleGrid.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing component tests**

```tsx
const person = (name: string): Assignee => ({
  id: "person-1", name, color: "#00B050", position: 1,
  createdAt: "2026-07-03T00:00:00Z", updatedAt: "2026-07-03T00:00:00Z",
});
const itemsWith = (name: string): ScheduleItem[] => [{
  id: "drawing-001", position: 1, section: "КЗ-0", sheetNumber: 1,
  title: "Заголовний лист", startDate: null, durationDays: null,
  assignee: name, status: "planned",
  createdAt: "2026-07-03T00:00:00Z", updatedAt: "2026-07-03T00:00:00Z",
}];

it("adds and applies an assignee with a chosen color", async () => {
  const onApply = vi.fn();
  render(<AssigneeDialog open assignees={[]} items={[]} onClose={() => {}} onApply={onApply} />);
  await user.click(screen.getByRole("button", { name: "Додати виконавця" }));
  await user.type(screen.getByLabelText("Ім’я виконавця 1"), "Ан");
  fireEvent.change(screen.getByLabelText("Колір виконавця 1"), { target: { value: "#123456" } });
  await user.click(screen.getByRole("button", { name: "Застосувати" }));
  expect(onApply).toHaveBeenCalledWith([expect.objectContaining({ name: "Ан", color: "#123456" })]);
});

it("disables deletion for a used assignee", () => {
  render(<AssigneeDialog open assignees={[person("ІВ")]} items={itemsWith("ІВ")} onClose={() => {}} onApply={() => {}} />);
  expect(screen.getByRole("button", { name: "Видалити ІВ" })).toBeDisabled();
  expect(screen.getByText("Використано у 1 кресленні")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/components/AssigneeDialog.test.tsx`
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the dialog**

Build a native `<dialog>` following `LoginDialog`: clone props to local state on open; render rows with text input, `<input type="color">`, hex preview, usage count, and delete button. Validate trimmed uniqueness and `^#[0-9A-F]{6}$` before `onApply(local)`; new entries use `crypto.randomUUID()` and ISO timestamps.

Add a secondary **«Виконавці»** button to `EditActions`. In `App`, own `assigneeDialogOpen`, pass `schedule.assignees/items`, and call `schedule.replaceAssignees` on apply.

Wire colors and names explicitly:

```tsx
<AssigneeLegend assignees={schedule.assignees} visibleAssignees={assigneeNames} />
<ScheduleGrid assignees={schedule.assignees} ... />
```

`GanttCells` receives the directory and calls `assigneeColor(item.assignee, assignees)`. `ScheduleGrid` creates options from `assignees.map(({ name }) => name)`.

Add responsive `.assignee-dialog`, `.assignee-editor-row`, `.color-control`, `.usage-note`, and `.assignee-dialog-actions` styles consistent with the existing navy/blue palette.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- src/components/AssigneeDialog.test.tsx src/App.test.tsx && npm run lint && npm run build`
Expected: tests, lint, and production build pass.

- [ ] **Step 5: Commit**

```powershell
git add src/components/AssigneeDialog.tsx src/components/AssigneeDialog.test.tsx src/components/EditActions.tsx src/components/AssigneeLegend.tsx src/components/GanttTimeline.tsx src/components/ScheduleGrid.tsx src/App.tsx src/styles.css
git commit -m "feat: add assignee management dialog"
```

### Task 6: End-to-end verification and documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Apply the new migration locally**

Run: `npx wrangler d1 migrations apply logistruct-schedule-db --local`
Expected: `0002_assignees.sql` applies successfully and `SELECT COUNT(*) FROM assignees` returns 17.

- [ ] **Step 2: Run the complete automated checks**

Run: `npm test && npm run lint && npm run build && npm run cf-typegen`
Expected: every test passes; lint and build exit 0; Cloudflare types regenerate without warnings.

- [ ] **Step 3: Verify the real browser flow**

Run `npm run dev:cf`, then with Playwright CLI:

1. Sign in and enter edit mode.
2. Open **«Виконавці»**.
3. Add `Ан` with `#123456`, apply, assign it to one row, and save the graph.
4. Reload and confirm the name, legend color, filter option, and Gantt bar persist.
5. Reopen the dialog and confirm deletion of `Ан` is disabled while assigned.
6. Check desktop 1536×1024 and mobile 390×844; confirm zero console errors or warnings.

- [ ] **Step 4: Update deployment notes**

Add to `README.md`:

````md
### Оновлення існуючого сайту

Перед публікацією версії з керуванням виконавцями застосуйте міграцію:

```powershell
npx wrangler d1 migrations apply logistruct-schedule-db --remote
npm run deploy
```
````

- [ ] **Step 5: Final verification and commit**

Run: `git diff --check && npm test && npm run lint && npm run build`
Expected: no whitespace errors; all checks pass.

```powershell
git add README.md
git commit -m "docs: document assignee migration"
git status --short
```

Expected status: only the user's pre-existing untracked `AGENTS.md` and Excel workbook remain.
