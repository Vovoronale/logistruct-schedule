import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Assignee, SchedulePayload } from "../types";
import type { ScheduleClient } from "../lib/api";
import { useSchedule } from "./useSchedule";

const assignee: Assignee = {
  id: "person-1",
  name: "ІВ",
  color: "#00B050",
  position: 1,
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
};

const payload: SchedulePayload = {
  revision: 1,
  updatedAt: "2026-07-03T00:00:00Z",
  assignees: [assignee],
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
};

function client(): ScheduleClient {
  return {
    getSchedule: vi.fn().mockResolvedValue(payload),
    getSession: vi.fn().mockResolvedValue(true),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockImplementation(async (draft) => ({
      ...draft,
      updatedAt: payload.updatedAt,
    })),
  };
}

describe("useSchedule assignee editing", () => {
  it("renames assigned rows and marks the shared draft dirty", async () => {
    const { result } = renderHook(() => useSchedule(client()));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.beginEditing(); });
    act(() => {
      result.current.replaceAssignees([{ ...assignee, name: "Ірина" }]);
    });
    expect(result.current.assignees[0].name).toBe("Ірина");
    expect(result.current.items[0].assignee).toBe("Ірина");
    expect(result.current.isDirty).toBe(true);
  });
});
