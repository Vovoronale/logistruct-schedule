import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { HolidaySet } from "../lib/dates";

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Невідома помилка";
}

function cloneItems(items: ScheduleItem[]): ScheduleItem[] {
  return items.map((item) => ({
    ...item,
    predecessorIds: [...item.predecessorIds],
  }));
}

function cloneAssignees(assignees: Assignee[]): Assignee[] {
  return assignees.map((person) => ({ ...person }));
}

interface DraftSnapshot {
  items: ScheduleItem[];
  assignees: Assignee[];
  isDirty: boolean;
}

export function useSchedule(
  client: ScheduleClient = scheduleClient,
  holidays: HolidaySet = new Set(),
) {
  const [saved, setSaved] = useState<SchedulePayload | null>(null);
  const [draftItems, setDraftItems] = useState<ScheduleItem[]>([]);
  const draftItemsRef = useRef<ScheduleItem[]>([]);
  const [draftAssignees, setDraftAssignees] = useState<Assignee[]>([]);
  const draftAssigneesRef = useRef<Assignee[]>([]);
  const undoStackRef = useRef<DraftSnapshot[]>([]);
  const isDirtyRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
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

  const replaceDraftItems = useCallback((next: ScheduleItem[]) => {
    draftItemsRef.current = next;
    setDraftItems(next);
  }, []);

  const replaceDraftAssignees = useCallback((next: Assignee[]) => {
    draftAssigneesRef.current = next;
    setDraftAssignees(next);
  }, []);

  const setDirty = useCallback((next: boolean) => {
    isDirtyRef.current = next;
    setIsDirty(next);
  }, []);

  const clearUndo = useCallback(() => {
    undoStackRef.current = [];
    setCanUndo(false);
  }, []);

  const pushUndoSnapshot = useCallback(() => {
    undoStackRef.current = [
      ...undoStackRef.current,
      {
        items: cloneItems(draftItemsRef.current),
        assignees: cloneAssignees(draftAssigneesRef.current),
        isDirty: isDirtyRef.current,
      },
    ];
    setCanUndo(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schedule, session] = await Promise.all([
        client.getSchedule(),
        client.getSession().catch(() => false),
      ]);
      setSaved(schedule);
      replaceDraftItems(cloneItems(schedule.items));
      replaceDraftAssignees(cloneAssignees(schedule.assignees));
      setAuthenticated(session);
      setDirty(false);
      setDependencyError(null);
      setComparisonSnapshot(null);
      setHistory([]);
      setHistoryError(null);
      clearUndo();
    } catch (loadError) {
      setError(messageFrom(loadError));
    } finally {
      setLoading(false);
    }
  }, [clearUndo, client, replaceDraftAssignees, replaceDraftItems, setDirty]);

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
    replaceDraftItems(cloneItems(saved.items));
    replaceDraftAssignees(cloneAssignees(saved.assignees));
    setIsEditing(true);
    setDirty(false);
    setDependencyError(null);
    setComparisonSnapshot(null);
    clearUndo();
    return true;
  }, [authenticated, clearUndo, replaceDraftAssignees, replaceDraftItems, saved, setDirty]);

  const login = useCallback(
    async (password: string) => {
      await client.login(password);
      setAuthenticated(true);
      if (saved) {
        replaceDraftItems(cloneItems(saved.items));
        replaceDraftAssignees(cloneAssignees(saved.assignees));
        setIsEditing(true);
        setDependencyError(null);
        setComparisonSnapshot(null);
        clearUndo();
      }
    },
    [clearUndo, client, replaceDraftAssignees, replaceDraftItems, saved],
  );

  const logout = useCallback(async () => {
    await client.logout();
    setAuthenticated(false);
    setIsEditing(false);
    setDirty(false);
    setDependencyError(null);
    setComparisonSnapshot(null);
    clearUndo();
  }, [clearUndo, client, setDirty]);

  const applyDraft = useCallback((
    update: ScheduleItem[] | ((current: ScheduleItem[]) => ScheduleItem[]),
  ) => {
    const next = typeof update === "function"
      ? update(draftItemsRef.current)
      : update;
    pushUndoSnapshot();
    try {
      replaceDraftItems(recalculateSchedule(next, holidays));
      setDependencyError(null);
      setError(null);
    } catch (draftError) {
      replaceDraftItems(cloneItems(next));
      const nextError = draftError instanceof DependencyError
        ? { itemId: draftError.itemId, message: draftError.message }
        : { itemId: "", message: "Не вдалося перерахувати залежності" };
      setDependencyError(nextError);
      setError(nextError.message);
    }
    setDirty(true);
  }, [holidays, pushUndoSnapshot, replaceDraftItems, setDirty]);

  const updateItem = useCallback(
    (id: string, patch: Partial<ScheduleItem>) => {
      applyDraft((current) =>
        current.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      );
    },
    [applyDraft],
  );

  const addItem = useCallback(() => {
    const now = new Date().toISOString();
    applyDraft((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        position: current.length + 1,
        section: current.at(-1)?.section ?? "КЗ-0",
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
  }, [applyDraft]);

  const removeItem = useCallback((id: string): boolean => {
    const current = draftItemsRef.current;
    const blockerIds = directDependentIds(current, id);
    if (blockerIds.length > 0) {
      const positions = blockerIds
        .map((blockerId) => current.find((item) => item.id === blockerId)?.position)
        .filter((position): position is number => position !== undefined)
        .map((position) => `№${position}`)
        .join(", ");
      const message = `Спочатку видаліть залежність у роботах: ${positions}`;
      setDependencyError({ itemId: id, message });
      setError(message);
      return false;
    }
    applyDraft((items) => normalizePositions(items.filter((item) => item.id !== id)));
    return true;
  }, [applyDraft]);

  const reorderItem = useCallback((activeId: string, overId: string) => {
    applyDraft((current) => moveItem(current, activeId, overId));
  }, [applyDraft]);

  const moveBy = useCallback((id: string, delta: -1 | 1) => {
    const current = draftItemsRef.current;
    const index = current.findIndex((item) => item.id === id);
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return;
    applyDraft((items) => moveItem(items, id, items[nextIndex].id));
  }, [applyDraft]);

  const replaceAssignees = useCallback((next: Assignee[]) => {
    const result = applyAssigneeChanges(draftItemsRef.current, draftAssigneesRef.current, next);
    applyDraft(result.items);
    replaceDraftAssignees(result.assignees);
  }, [applyDraft, replaceDraftAssignees]);

  const undoLast = useCallback(() => {
    const snapshot = undoStackRef.current.at(-1);
    if (!snapshot) return;
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    replaceDraftItems(cloneItems(snapshot.items));
    replaceDraftAssignees(cloneAssignees(snapshot.assignees));
    setDirty(snapshot.isDirty);
    setDependencyError(null);
    setError(null);
    setCanUndo(undoStackRef.current.length > 0);
  }, [replaceDraftAssignees, replaceDraftItems, setDirty]);

  const cancel = useCallback(() => {
    if (!saved) return;
    replaceDraftItems(cloneItems(saved.items));
    replaceDraftAssignees(cloneAssignees(saved.assignees));
    setIsEditing(false);
    setDirty(false);
    setDependencyError(null);
    setError(null);
    clearUndo();
  }, [clearUndo, replaceDraftAssignees, replaceDraftItems, saved, setDirty]);

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
        items: normalizePositions(draftItemsRef.current),
        assignees: draftAssignees,
        holidays: [...holidays].sort(),
      });
      setSaved(next);
      replaceDraftItems(cloneItems(next.items));
      replaceDraftAssignees(cloneAssignees(next.assignees));
      setDirty(false);
      setIsEditing(false);
      setDependencyError(null);
      setComparisonSnapshot(null);
      setHistory([]);
      clearUndo();
    } catch (saveError) {
      setError(messageFrom(saveError));
      throw saveError;
    } finally {
      setSaving(false);
    }
  }, [clearUndo, client, dependencyError, draftAssignees, holidays, replaceDraftAssignees, replaceDraftItems, saved, setDirty]);

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
      canUndo,
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
      undoLast,
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
      canUndo,
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
      undoLast,
      cancel,
      save,
      loadHistory,
      selectHistoryRevision,
      clearComparison,
    ],
  );
}
