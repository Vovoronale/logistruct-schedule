import { describe, expect, it, vi } from "vitest";
import { loadHolidays, normalizeHolidays } from "./holidays";

describe("normalizeHolidays", () => {
  it("keeps unique valid ISO calendar dates", () => {
    expect(normalizeHolidays(["2026-08-24", "bad", "2026-08-24", "2026-02-30"]))
      .toEqual(new Set(["2026-08-24"]));
  });

  it("returns an empty set for a non-array value", () => {
    expect(normalizeHolidays({ date: "2026-08-24" })).toEqual(new Set());
  });
});

describe("loadHolidays", () => {
  it("loads and normalizes the public file", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(
      JSON.stringify(["2026-08-24", "bad"]),
      { status: 200 },
    ));
    await expect(loadHolidays(fetcher)).resolves.toEqual(new Set(["2026-08-24"]));
  });

  it("falls back to an empty set when loading fails", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(loadHolidays(fetcher)).resolves.toEqual(new Set());
  });
});
