import { describe, expect, it } from "vitest";
import { parseSnapshot, readSchedule } from "./schedule-storage";

interface FakeData {
  meta?: Record<string, unknown> | null;
  items?: Record<string, unknown>[];
  dependencies?: Record<string, unknown>[];
  assignees?: Record<string, unknown>[];
}

function itemRow(id: string, startMode = "manual") {
  return {
    id,
    position: id === "a" ? 1 : 2,
    section: "КЗ",
    sheet_number: 1,
    title: id,
    start_mode: startMode,
    start_date: "2026-07-06",
    duration_days: 1,
    assignee: null,
    status: "planned",
    created_at: "2026-07-03T00:00:00Z",
    updated_at: "2026-07-03T00:00:00Z",
  };
}

function fakeDb(data: FakeData): D1Database {
  return {
    prepare(sql: string) {
      return {
        async first() {
          return data.meta ?? null;
        },
        async all() {
          if (sql.includes("FROM item_dependencies")) {
            return { results: data.dependencies ?? [] };
          }
          if (sql.includes("FROM assignees")) {
            return { results: data.assignees ?? [] };
          }
          return { results: data.items ?? [] };
        },
      };
    },
  } as unknown as D1Database;
}

describe("readSchedule", () => {
  it("groups normalized dependency rows onto schedule items", async () => {
    const payload = await readSchedule(fakeDb({
      meta: { revision: 3, updated_at: "2026-07-03T10:00:00Z" },
      items: [itemRow("a"), itemRow("b", "dependencies")],
      dependencies: [{ item_id: "b", predecessor_id: "a" }],
      assignees: [],
    }));

    expect(payload).toMatchObject({ revision: 3, updatedAt: "2026-07-03T10:00:00Z" });
    expect(payload.items[0]).toMatchObject({
      id: "a",
      startMode: "manual",
      predecessorIds: [],
    });
    expect(payload.items[1]).toMatchObject({
      id: "b",
      startMode: "dependencies",
      predecessorIds: ["a"],
    });
  });

  it("rejects a missing metadata row", async () => {
    await expect(readSchedule(fakeDb({ meta: null })))
      .rejects.toThrow("SCHEDULE_META_MISSING");
  });
});

describe("parseSnapshot", () => {
  it("returns a complete stored payload", () => {
    const snapshot = {
      revision: 2,
      updatedAt: "2026-07-03T10:00:00Z",
      items: [],
      assignees: [],
    };

    expect(parseSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it.each([
    "{broken",
    "null",
    JSON.stringify({ revision: "2", updatedAt: "now", items: [], assignees: [] }),
    JSON.stringify({ revision: 2, updatedAt: "now", items: {}, assignees: [] }),
  ])("rejects malformed stored data", (snapshotJson) => {
    expect(() => parseSnapshot(snapshotJson)).toThrow("INVALID_HISTORY_SNAPSHOT");
  });
});
