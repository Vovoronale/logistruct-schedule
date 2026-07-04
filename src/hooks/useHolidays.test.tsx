import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useHolidays } from "./useHolidays";

afterEach(() => vi.unstubAllGlobals());

it("exposes normalized holidays after loading", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify(["2026-08-24", "invalid"]),
    { status: 200 },
  )));
  const { result } = renderHook(() => useHolidays());
  await waitFor(() => expect(result.current).toEqual(new Set(["2026-08-24"])));
});
