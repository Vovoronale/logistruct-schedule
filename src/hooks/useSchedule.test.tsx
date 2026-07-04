import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  Assignee,
  ScheduleHistorySnapshot,
  ScheduleItem,
  SchedulePayload,
} from "../types";
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

const item = (
  id: string,
  position: number,
  patch: Partial<ScheduleItem> = {},
): ScheduleItem => ({
  id,
  position,
  section: "КЗ-0",
  sheetNumber: position,
  title: id,
  startMode: "manual",
  startDate: "2026-07-06",
  durationDays: 2,
  predecessorIds: [],
  assignee: "ІВ",
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
  ...patch,
});

const payload: SchedulePayload = {
  revision: 1,
  updatedAt: "2026-07-03T00:00:00Z",
  assignees: [assignee],
  items: [item("drawing-001", 1)],
};

const dependencyPayload: SchedulePayload = {
  ...payload,
  items: [
    item("a", 1),
    item("b", 2, {
      startMode: "dependencies",
      startDate: "2026-07-08",
      durationDays: 1,
      predecessorIds: ["a"],
    }),
  ],
};

function client(
  schedule: SchedulePayload = payload,
  overrides: Partial<ScheduleClient> = {},
): ScheduleClient {
  return {
    getSchedule: vi.fn().mockResolvedValue(schedule),
    getSession: vi.fn().mockResolvedValue(true),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    getHistory: vi.fn().mockResolvedValue([]),
    getHistoryRevision: vi.fn().mockRejectedValue(new Error("not selected")),
    save: vi.fn((draft) => Promise.resolve({
      ...draft,
      updatedAt: schedule.updatedAt,
    })),
    ...overrides,
  };
}

async function editingHook(api: ScheduleClient) {
  const hook = renderHook(() => useSchedule(api));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  act(() => { hook.result.current.beginEditing(); });
  return hook;
}

it("submits normalized holidays with a saved draft", async () => {
  const save = vi.fn().mockResolvedValue(payload);
  const api = client(payload, { save });
  const { result } = renderHook(() => useSchedule(
    api,
    new Set(["2026-07-07"]),
  ));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => { result.current.beginEditing(); });
  act(() => { result.current.updateItem("drawing-001", { durationDays: 3 }); });
  await act(async () => { await result.current.save(); });
  expect(save).toHaveBeenCalledWith(expect.objectContaining({
    holidays: ["2026-07-07"],
  }));
});

describe("useSchedule assignee editing", () => {
  it("renames assigned rows and marks the shared draft dirty", async () => {
    const { result } = await editingHook(client());

    act(() => {
      result.current.replaceAssignees([{ ...assignee, name: "Ірина" }]);
    });

    expect(result.current.assignees[0].name).toBe("Ірина");
    expect(result.current.items[0].assignee).toBe("Ірина");
    expect(result.current.isDirty).toBe(true);
  });
});

describe("useSchedule dependency editing", () => {
  it("preserves rapid sequential patches to the same draft", async () => {
    const { result } = await editingHook(client());

    act(() => {
      result.current.updateItem("drawing-001", { startDate: "2026-07-07" });
      result.current.updateItem("drawing-001", { durationDays: 3 });
    });

    expect(result.current.items[0]).toMatchObject({
      startDate: "2026-07-07",
      durationDays: 3,
    });
  });

  it("cascades an upstream duration change", async () => {
    const { result } = await editingHook(client(dependencyPayload));

    act(() => { result.current.updateItem("a", { durationDays: 4 }); });

    expect(result.current.items.find((row) => row.id === "b")?.startDate)
      .toBe("2026-07-10");
    expect(result.current.dependencyError).toBeNull();
  });

  it("preserves stable dependency ids across reordering", async () => {
    const { result } = await editingHook(client(dependencyPayload));

    act(() => { result.current.reorderItem("a", "b"); });

    expect(result.current.items.find((row) => row.id === "b")?.predecessorIds)
      .toEqual(["a"]);
    expect(result.current.items.find((row) => row.id === "a")?.position).toBe(2);
  });

  it("blocks deletion of a referenced predecessor", async () => {
    const { result } = await editingHook(client(dependencyPayload));

    let removed = true;
    act(() => { removed = result.current.removeItem("a"); });

    expect(removed).toBe(false);
    expect(result.current.items).toHaveLength(2);
    expect(result.current.error).toContain("№2");
  });

  it("keeps an invalid draft visible but disables saving", async () => {
    const save = vi.fn().mockResolvedValue(dependencyPayload);
    const api = client(dependencyPayload, { save });
    const { result } = await editingHook(api);

    act(() => {
      result.current.updateItem("a", {
        startMode: "dependencies",
        startDate: null,
        predecessorIds: ["b"],
      });
    });

    expect(result.current.dependencyError?.message)
      .toBe("Виявлено цикл залежностей");
    expect(result.current.canSave).toBe(false);
    await expect(result.current.save()).rejects.toThrow("Виявлено цикл залежностей");
    expect(save).not.toHaveBeenCalled();
  });
});

describe("useSchedule history", () => {
  it("loads metadata and a selected comparison snapshot", async () => {
    const snapshot: ScheduleHistorySnapshot = { ...payload, revision: 4 };
    const api = client(payload, {
      getHistory: vi.fn().mockResolvedValue([
        { revision: 4, savedAt: "2026-07-03T10:00:00Z" },
      ]),
      getHistoryRevision: vi.fn().mockResolvedValue(snapshot),
    });
    const { result } = renderHook(() => useSchedule(api));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.loadHistory(); });
    await act(async () => { await result.current.selectHistoryRevision(4); });

    expect(result.current.history).toEqual([
      { revision: 4, savedAt: "2026-07-03T10:00:00Z" },
    ]);
    expect(result.current.comparisonSnapshot?.revision).toBe(4);
    act(() => { result.current.clearComparison(); });
    expect(result.current.comparisonSnapshot).toBeNull();
  });

  it("keeps the current schedule when history loading fails", async () => {
    const api = client(payload, {
      getHistory: vi.fn().mockRejectedValue(new Error("history unavailable")),
    });
    const { result } = renderHook(() => useSchedule(api));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.loadHistory(); });

    expect(result.current.saved?.revision).toBe(1);
    expect(result.current.historyError).toBe("history unavailable");
  });
});
