import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleClient } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("schedule history client", () => {
  it("loads retained revision metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { revision: 6, savedAt: "2026-07-03T11:00:00Z" },
    ]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(scheduleClient.getHistory()).resolves.toEqual([
      { revision: 6, savedAt: "2026-07-03T11:00:00Z" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/schedule/history",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("loads one retained snapshot", async () => {
    const snapshot = {
      revision: 6,
      updatedAt: "2026-07-03T11:00:00Z",
      items: [],
      assignees: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify(snapshot),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(scheduleClient.getHistoryRevision(6)).resolves.toEqual(snapshot);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/schedule/history/6",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });
});
