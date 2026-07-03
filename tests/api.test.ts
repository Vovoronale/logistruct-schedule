import { describe, expect, it } from "vitest";
import { onRequestGet, onRequestPut } from "../functions/api/schedule";
import { createSessionToken } from "../functions/lib/auth";

function createContext(options?: {
  request?: Request;
  revision?: number;
  rows?: Record<string, unknown>[];
  assigneeRows?: Record<string, unknown>[];
}) {
  const db = {
    prepare(sql: string) {
      return {
        bind() {
          return this;
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
          if (sql.includes("FROM assignees")) {
            return { results: options?.assigneeRows ?? [], success: true, meta: {} };
          }
          return { results: options?.rows ?? [], success: true, meta: {} };
        },
      };
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
});
