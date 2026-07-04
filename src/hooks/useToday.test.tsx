import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useToday } from "./useToday";

afterEach(() => {
  vi.useRealTimers();
});

describe("useToday", () => {
  it("uses the local date and updates after local midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 3, 23, 59, 59, 900));

    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-07-03");

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("2026-07-04");
  });
});
