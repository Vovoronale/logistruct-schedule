import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  addWorkingDays,
  createDemoFixture,
  renderFixtureSql,
  renderFixtureSqlChunks,
  validateFixture,
} from "../scripts/test-data.mjs";
import { join, resolve } from "node:path";
import {
  assertSafeTestStatePath,
  wranglerInvocation,
} from "../scripts/test-db.mjs";

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

describe("test data date helpers", () => {
  it("uses UTC calendar dates and skips weekends for working days", () => {
    expect(addCalendarDays("2026-07-04", -4)).toBe("2026-06-30");
    expect(addWorkingDays("2026-07-03", 1)).toBe("2026-07-06");
    expect(addWorkingDays("2026-07-03", 5)).toBe("2026-07-10");
  });
});

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
    expect(fixture.dependencies).toHaveLength(14);
    expect(fixture.history).toHaveLength(3);
    expect(fixture.revision).toBe(5);
    expect(() => validateFixture(fixture)).not.toThrow();
    expect(createDemoFixture(baseItems, assignees, "2026-07-04"))
      .toEqual(fixture);
  });

  it("creates acyclic branches, joins, and useful comparison history", () => {
    const fixture = createDemoFixture(baseItems, assignees, "2026-07-04");
    const positions = new Map(
      fixture.items.map((item) => [item.id, item.position]),
    );
    const predecessors = (itemId: string) => fixture.dependencies
      .filter((edge) => edge.itemId === itemId)
      .map((edge) => edge.predecessorId);

    for (const edge of fixture.dependencies) {
      expect(positions.get(edge.predecessorId)).toBeLessThan(
        positions.get(edge.itemId),
      );
    }
    expect(predecessors("drawing-022")).toHaveLength(2);
    expect(predecessors("drawing-053")).toHaveLength(2);

    const oldest = fixture.history.find((snapshot) => snapshot.revision === 2);
    expect(oldest?.items.some((item) => item.id === "drawing-068")).toBe(false);
    expect(oldest?.items.some((item) => item.id === "test-removed-001")).toBe(true);
    expect(oldest?.assignees).toHaveLength(17);
  });

  it("rejects an incomplete migrated base dataset", () => {
    expect(() => createDemoFixture(baseItems.slice(0, 67), assignees, "2026-07-04"))
      .toThrow("EXPECTED_68_BASE_ITEMS");
    expect(() => createDemoFixture(baseItems, assignees.slice(0, 16), "2026-07-04"))
      .toThrow("EXPECTED_17_ASSIGNEES");
  });
});

describe("renderFixtureSql", () => {
  it("renders idempotent D1 batches with escaped values", () => {
    const fixture = createDemoFixture(baseItems, assignees, "2026-07-04");
    fixture.items[0].title = "Креслення з 'апострофом'";

    const sql = renderFixtureSql(fixture);

    expect(sql).not.toContain("BEGIN IMMEDIATE;");
    expect(sql).not.toContain("COMMIT;");
    expect(sql).toContain("DELETE FROM item_dependencies;");
    expect(sql).toContain("DELETE FROM schedule_history;");
    expect(sql).toContain("UPDATE schedule_items SET position = position + 1000;");
    expect(sql).toContain("Креслення з ''апострофом''");
    expect((sql.match(/UPDATE schedule_items\nSET/g) ?? [])).toHaveLength(68);
    expect((sql.match(/INSERT INTO item_dependencies/g) ?? [])).toHaveLength(14);
    expect((sql.match(/INSERT INTO schedule_history/g) ?? [])).toHaveLength(3);
    expect(sql.trim().endsWith("WHERE id = 1;")).toBe(true);
  });

  it("splits large fixtures into independently transactional D1 batches", () => {
    const fixture = createDemoFixture(baseItems, assignees, "2026-07-04");

    const chunks = renderFixtureSqlChunks(fixture, 30_000);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(Buffer.byteLength(chunk, "utf8")).toBeLessThanOrEqual(30_000);
      expect(chunk).not.toContain("BEGIN IMMEDIATE;");
      expect(chunk).not.toContain("COMMIT;");
      expect(chunk.trim().endsWith(";")).toBe(true);
    }
    expect(chunks.join("\n").match(/INSERT INTO schedule_history/g)).toHaveLength(3);
  });
});

describe("assertSafeTestStatePath", () => {
  it("only accepts the repository test-state directory", () => {
    const root = resolve("fixture-root");
    const expected = join(root, ".wrangler", "test-state");

    expect(() => assertSafeTestStatePath(root, expected)).not.toThrow();
    expect(() => assertSafeTestStatePath(root, join(root, ".wrangler", "state")))
      .toThrow("UNSAFE_TEST_STATE_PATH");
    expect(() => assertSafeTestStatePath(root, resolve("outside")))
      .toThrow("UNSAFE_TEST_STATE_PATH");
  });

  it("invokes Wrangler through Node instead of a Windows command shim", () => {
    const root = resolve("fixture-root");
    const invocation = wranglerInvocation(root, "C:\\Program Files\\nodejs\\node.exe");

    expect(invocation).toEqual({
      command: "C:\\Program Files\\nodejs\\node.exe",
      prefix: [join(root, "node_modules", "wrangler", "bin", "wrangler.js")],
    });
  });
});
