import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Assignee,
  ScheduleHistoryEntry,
  ScheduleHistorySnapshot,
  ScheduleItem,
  SchedulePayload,
} from "../types";
import { scheduleClient, type ScheduleClient } from "../lib/api";
import { applyAssigneeChanges } from "../lib/assignees";
import {
  DependencyError,
  directDependentIds,
  recalculateSchedule,
} from "../lib/dependencies";
import { moveItem, normalizePositions } from "../lib/schedule";

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Невідома помилка";
}

function cloneItems(items: ScheduleItem[]): ScheduleItem[] {
  return items.map((item) => ({
    ...item,
    predecessorIds: [...item.predecessorIds],
  }));
}

export function useSchedule(client: ScheduleClient = scheduleClient) {
  const [saved, setSaved] = useState<SchedulePayload | null>(null);
  const [draftItems, setDraftItems] = useState<ScheduleItem[]>([]);
  const [draftAssignees, setDraftAssignees] = useState<Assignee[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dependencyError, setDependencyError] = useState<{
    itemId: string;
    message: string;
  } | null>(null);
  const [history, setHistory] = useState<ScheduleHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [comparisonSnapshot, setComparisonSnapshot] =
    useState<ScheduleHistorySnapshot | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schedule, session] = await Promise.all([
        client.getSchedule(),
        client.getSession().catch(() => false),
      ]);
      setSaved(schedule);
      setDraftItems(cloneItems(schedule.items));
      setDraftAssignees(schedule.assignees);
      setAuthenticated(session);
      setIsDirty(false);
      setDependencyError(null);
      setComparisonSnapshot(null);
      setHistory([]);
      setHistoryError(null);
    } catch (loadError) {
      setError(messageFrom(loadError));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const items = useMemo(
    () => (isEditing ? draftItems : (saved?.items ?? [])),
    [draftItems, isEditing, saved],
  );
  const assignees = useMemo(
    () => (isEditing ? draftAssignees : (saved?.assignees ?? [])),
    [draftAssignees, isEditing, saved],
  );

  const beginEditing = useCallback(() => {
    if (!authenticated || !saved) return false;
    setDraftItems(cloneItems(saved.items));
    setDraftAssignees(saved.assignees.map((person) => ({ ...person })));
    setIsEditing(true);
    setIsDirty(false);
    setDependencyError(null);
    setComparisonSnapshot(null);
    return true;
  }, [authenticated, saved]);

  const login = useCallback(
    async (password: string) => {
      await client.login(password);
      setAuthenticated(true);
      if (saved) {
        setDraftItems(cloneItems(saved.items));
        setDraftAssignees(saved.assignees.map((person) => ({ ...person })));
        setIsEditing(true);
        setDependencyError(null);
        setComparisonSnapshot(null);
      }
    },
    [client, saved],
  );

  const logout = useCallback(async () => {
    await client.logout();
    setAuthenticated(false);
    setIsEditing(false);
    setIsDirty(false);
    setDependencyError(null);
    setComparisonSnapshot(null);
  }, [client]);

  const applyDraft = useCallback((next: ScheduleItem[]) => {
    try {
      setDraftItems(recalculateSchedule(next));
      setDependencyError(null);
      setError(null);
    } catch (draftError) {
      setDraftItems(cloneItems(next));
      const nextError = draftError instanceof DependencyError
        ? { itemId: draftError.itemId, message: draftError.message }
        : { itemId: "", message: "Не вдалося перерахувати залежності" };
      setDependencyError(nextError);
      setError(nextError.message);
    }
    setIsDirty(true);
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<ScheduleItem>) => {
      applyDraft(
        draftItems.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      );
    },
    [applyDraft, draftItems],
  );

  const addItem = useCallback(() => {
    const now = new Date().toISOString();
    applyDraft([
      ...draftItems,
      {
        id: crypto.randomUUID(),
        position: draftItems.length + 1,
        section: draftItems.at(-1)?.section ?? "КЗ-0",
        sheetNumber: 1,
        title: "Нове креслення",
        startMode: "manual",
        startDate: null,
        durationDays: null,
        predecessorIds: [],
        assignee: null,
        status: "planned",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }, [applyDraft, draftItems]);

  const removeItem = useCallback((id: string): boolean => {
    const blockerIds = directDependentIds(draftItems, id);
    if (blockerIds.length > 0) {
      const positions = blockerIds
        .map((blockerId) => draftItems.find((item) => item.id === blockerId)?.position)
        .filter((position): position is number => position !== undefined)
        .map((position) => `№${position}`)
        .join(", ");
      const message = `Спочатку видаліть залежність у роботах: ${positions}`;
      setDependencyError({ itemId: id, message });
      setError(message);
      return false;
    }
    applyDraft(normalizePositions(draftItems.filter((item) => item.id !== id)));
    return true;
  }, [applyDraft, draftItems]);

  const reorderItem = useCallback((activeId: string, overId: string) => {
    applyDraft(moveItem(draftItems, activeId, overId));
  }, [applyDraft, draftItems]);

  const moveBy = useCallback((id: string, delta: -1 | 1) => {
    const index = draftItems.findIndex((item) => item.id === id);
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= draftItems.length) return;
    applyDraft(moveItem(draftItems, id, draftItems[nextIndex].id));
  }, [applyDraft, draftItems]);

  const replaceAssignees = useCallback((next: Assignee[]) => {
    const result = applyAssigneeChanges(draftItems, draftAssignees, next);
    applyDraft(result.items);
    setDraftAssignees(result.assignees);
  }, [applyDraft, draftAssignees, draftItems]);

  const cancel = useCallback(() => {
    if (!saved) return;
    setDraftItems(cloneItems(saved.items));
    setDraftAssignees(saved.assignees.map((person) => ({ ...person })));
    setIsEditing(false);
    setIsDirty(false);
    setDependencyError(null);
    setError(null);
  }, [saved]);

  const save = useCallback(async () => {
    if (!saved) return;
    if (dependencyError) {
      setError(dependencyError.message);
      throw new Error(dependencyError.message);
    }
    setSaving(true);
    setError(null);
    try {
      const next = await client.save({
        revision: saved.revision,
        items: normalizePositions(draftItems),
        assignees: draftAssignees,
      });
      setSaved(next);
      setDraftItems(next.items);
      setDraftAssignees(next.assignees);
      setIsDirty(false);
      setIsEditing(false);
      setDependencyError(null);
      setComparisonSnapshot(null);
      setHistory([]);
    } catch (saveError) {
      setError(messageFrom(saveError));
      throw saveError;
    } finally {
      setSaving(false);
    }
  }, [client, dependencyError, draftAssignees, draftItems, saved]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await client.getHistory());
    } catch (loadError) {
      setHistoryError(messageFrom(loadError));
    } finally {
      setHistoryLoading(false);
    }
  }, [client]);

  const selectHistoryRevision = useCallback(async (revision: number) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setComparisonSnapshot(await client.getHistoryRevision(revision));
    } catch (loadError) {
      setHistoryError(messageFrom(loadError));
      setComparisonSnapshot(null);
    } finally {
      setHistoryLoading(false);
    }
  }, [client]);

  const clearComparison = useCallback(() => {
    setComparisonSnapshot(null);
    setHistoryError(null);
  }, []);

  const canSave = isDirty && dependencyError === null && !saving;

  return useMemo(
    () => ({
      items,
      assignees,
      saved,
      authenticated,
      isEditing,
      isDirty,
      loading,
      saving,
      error,
      dependencyError,
      canSave,
      history,
      historyLoading,
      historyError,
      comparisonSnapshot,
      load,
      beginEditing,
      login,
      logout,
      updateItem,
      addItem,
      removeItem,
      reorderItem,
      moveBy,
      replaceAssignees,
      cancel,
      save,
      loadHistory,
      selectHistoryRevision,
      clearComparison,
      clearError: () => setError(null),
    }),
    [
      items,
      assignees,
      saved,
      authenticated,
      isEditing,
      isDirty,
      loading,
      saving,
      error,
      dependencyError,
      canSave,
      history,
      historyLoading,
      historyError,
      comparisonSnapshot,
      load,
      beginEditing,
      login,
      logout,
      updateItem,
      addItem,
      removeItem,
      reorderItem,
      moveBy,
      replaceAssignees,
      cancel,
      save,
      loadHistory,
      selectHistoryRevision,
      clearComparison,
    ],
  );
}
