import { describe, expect, it } from "vitest";
import { onRequestGet, onRequestPut } from "../functions/api/schedule";

function createContext(options?: {
  request?: Request;
  revision?: number;
  rows?: Record<string, unknown>[];
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
});
