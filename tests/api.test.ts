import { describe, expect, it } from "vitest";
import { onRequestGet, onRequestPut } from "../functions/api/schedule";
import { createSessionToken } from "../functions/lib/auth";

function createContext(options?: {
  request?: Request;
  revision?: number;
  rows?: Record<string, unknown>[];
  assigneeRows?: Record<string, unknown>[];
  dependencyRows?: Record<string, unknown>[];
  batchError?: Error;
}) {
  const recording = {
    batches: 0,
    statements: [] as { sql: string; values: unknown[] }[],
  };
  const statement = (sql: string, values: unknown[] = []) => ({
    sql,
    values,
    bind(...nextValues: unknown[]) {
      return statement(sql, nextValues);
    },
    async first() {
      if (sql.includes("schedule_meta")) {
        return {
          revision: options?.revision ?? 1,
          updated_at: "2026-07-03T00:00:00Z",
        };
      }
      return null;
    },
    async all() {
      if (sql.includes("FROM item_dependencies")) {
        return { results: options?.dependencyRows ?? [], success: true, meta: {} };
      }
      if (sql.includes("FROM assignees")) {
        return { results: options?.assigneeRows ?? [], success: true, meta: {} };
      }
      return { results: options?.rows ?? [], success: true, meta: {} };
    },
  });
  const db = {
    prepare(sql: string) {
      return statement(sql);
    },
    async batch(statements: ReturnType<typeof statement>[]) {
      recording.batches += 1;
      recording.statements.push(
        ...statements.map(({ sql, values }) => ({ sql, values })),
      );
      if (options?.batchError) throw options.batchError;
      return [];
    },
  };

  return {
    request: options?.request ?? new Request("https://example.com/api/schedule"),
    env: {
      DB: db,
      ADMIN_PASSWORD: "correct-password",
      SESSION_SECRET: "a-secret-long-enough-for-tests",
    },
    params: {},
    data: {},
    functionPath: "/api/schedule",
    waitUntil() {},
    passThroughOnException() {},
    next: async () => new Response(null, { status: 404 }),
    recording,
  };
}

describe("schedule API", () => {
  it("allows public schedule reads", async () => {
    const response = await onRequestGet(createContext() as never);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      revision: 1,
      items: [],
      assignees: [],
    });
  });

  it("returns the public assignee directory", async () => {
    const response = await onRequestGet(createContext({
      assigneeRows: [{
        id: "person-1",
        name: "ІВ",
        color: "#00B050",
        position: 1,
        created_at: "2026-07-03T00:00:00Z",
        updated_at: "2026-07-03T00:00:00Z",
      }],
    }) as never);
    await expect(response.json()).resolves.toMatchObject({
      assignees: [{ id: "person-1", name: "ІВ", color: "#00B050", position: 1 }],
    });
  });

  it("rejects an unauthenticated schedule save", async () => {
    const request = new Request("https://example.com/api/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: 1, items: [] }),
    });
    const response = await onRequestPut(createContext({ request }) as never);
    expect(response.status).toBe(401);
  });

  it("rejects removal of an assignee still used by a drawing", async () => {
    const secret = "a-secret-long-enough-for-tests";
    const token = await createSessionToken(secret);
    const request = new Request("https://example.com/api/schedule", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `logistruct_session=${token}`,
      },
      body: JSON.stringify({
        revision: 1,
        items: [{
          id: "drawing-001",
          position: 1,
          section: "КЗ-0",
          sheetNumber: 1,
          title: "Заголовний лист",
          startDate: null,
          durationDays: null,
          assignee: "ІВ",
          status: "planned",
          createdAt: "2026-07-03T00:00:00Z",
          updatedAt: "2026-07-03T00:00:00Z",
        }],
        assignees: [],
      }),
    });
    const response = await onRequestPut(createContext({
      request,
      assigneeRows: [{ name: "ІВ" }],
    }) as never);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Спочатку замініть виконавця ІВ у кресленнях",
    });
  });

  it("saves the outgoing snapshot and normalized dependencies in one batch", async () => {
    const token = await createSessionToken("a-secret-long-enough-for-tests");
    const request = new Request("https://example.com/api/schedule", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `logistruct_session=${token}`,
      },
      body: JSON.stringify({
        revision: 1,
        assignees: [],
        items: [
          {
            id: "drawing-a",
            position: 1,
            section: "КЗ",
            sheetNumber: 1,
            title: "A",
            startMode: "manual",
            startDate: "2026-07-06",
            durationDays: 2,
            predecessorIds: [],
            assignee: null,
            status: "planned",
            createdAt: "2026-07-03T00:00:00Z",
            updatedAt: "2026-07-03T00:00:00Z",
          },
          {
            id: "drawing-b",
            position: 2,
            section: "КЗ",
            sheetNumber: 2,
            title: "B",
            startMode: "dependencies",
            startDate: "2030-01-01",
            durationDays: 1,
            predecessorIds: ["drawing-a"],
            assignee: null,
            status: "planned",
            createdAt: "2026-07-03T00:00:00Z",
            updatedAt: "2026-07-03T00:00:00Z",
          },
        ],
      }),
    });
    const context = createContext({ request });

    const response = await onRequestPut(context as never);

    expect(response.status).toBe(200);
    expect(context.recording.batches).toBe(1);
    expect(context.recording.statements.map(({ sql }) => sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("INSERT OR REPLACE INTO schedule_history"),
        expect.stringContaining("DELETE FROM item_dependencies"),
        expect.stringContaining("INSERT INTO item_dependencies"),
        expect.stringContaining("DELETE FROM schedule_history"),
      ]),
    );
    const history = context.recording.statements.find(({ sql }) =>
      sql.includes("INSERT OR REPLACE INTO schedule_history"),
    );
    expect(JSON.parse(String(history?.values[2]))).toMatchObject({ revision: 1 });
    await expect(response.json()).resolves.toMatchObject({
      revision: 2,
      items: [
        { id: "drawing-a", startDate: "2026-07-06" },
        {
          id: "drawing-b",
          startDate: "2026-07-08",
          predecessorIds: ["drawing-a"],
        },
      ],
    });
  });

  it("returns an error when the atomic batch fails", async () => {
    const token = await createSessionToken("a-secret-long-enough-for-tests");
    const request = new Request("https://example.com/api/schedule", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `logistruct_session=${token}`,
      },
      body: JSON.stringify({ revision: 1, items: [], assignees: [] }),
    });
    const context = createContext({ request, batchError: new Error("D1_BATCH_FAILED") });

    const response = await onRequestPut(context as never);

    expect(response.status).toBe(500);
    expect(context.recording.batches).toBe(1);
  });
});
