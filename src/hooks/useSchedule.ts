import { useCallback, useEffect, useMemo, useState } from "react";
import type { Assignee, ScheduleItem, SchedulePayload } from "../types";
import { scheduleClient, type ScheduleClient } from "../lib/api";
import { applyAssigneeChanges } from "../lib/assignees";
import { moveItem, normalizePositions } from "../lib/schedule";

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Невідома помилка";
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schedule, session] = await Promise.all([
        client.getSchedule(),
        client.getSession().catch(() => false),
      ]);
      setSaved(schedule);
      setDraftItems(schedule.items);
      setDraftAssignees(schedule.assignees);
      setAuthenticated(session);
      setIsDirty(false);
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
    setDraftItems(saved.items.map((item) => ({ ...item })));
    setDraftAssignees(saved.assignees.map((person) => ({ ...person })));
    setIsEditing(true);
    setIsDirty(false);
    return true;
  }, [authenticated, saved]);

  const login = useCallback(
    async (password: string) => {
      await client.login(password);
      setAuthenticated(true);
      if (saved) {
        setDraftItems(saved.items.map((item) => ({ ...item })));
        setDraftAssignees(saved.assignees.map((person) => ({ ...person })));
        setIsEditing(true);
      }
    },
    [client, saved],
  );

  const logout = useCallback(async () => {
    await client.logout();
    setAuthenticated(false);
    setIsEditing(false);
    setIsDirty(false);
  }, [client]);

  const updateItem = useCallback(
    (id: string, patch: Partial<ScheduleItem>) => {
      setDraftItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
      setIsDirty(true);
    },
    [],
  );

  const addItem = useCallback(() => {
    const now = new Date().toISOString();
    setDraftItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        position: current.length + 1,
        section: current.at(-1)?.section ?? "КЗ-0",
        sheetNumber: 1,
        title: "Нове креслення",
        startDate: null,
        durationDays: null,
        assignee: null,
        status: "planned",
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setIsDirty(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setDraftItems((current) =>
      normalizePositions(current.filter((item) => item.id !== id)),
    );
    setIsDirty(true);
  }, []);

  const reorderItem = useCallback((activeId: string, overId: string) => {
    setDraftItems((current) => moveItem(current, activeId, overId));
    setIsDirty(true);
  }, []);

  const moveBy = useCallback((id: string, delta: -1 | 1) => {
    setDraftItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const nextIndex = index + delta;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      return moveItem(current, id, current[nextIndex].id);
    });
    setIsDirty(true);
  }, []);

  const replaceAssignees = useCallback((next: Assignee[]) => {
    const result = applyAssigneeChanges(draftItems, draftAssignees, next);
    setDraftItems(result.items);
    setDraftAssignees(result.assignees);
    setIsDirty(true);
  }, [draftAssignees, draftItems]);

  const cancel = useCallback(() => {
    if (!saved) return;
    setDraftItems(saved.items.map((item) => ({ ...item })));
    setDraftAssignees(saved.assignees.map((person) => ({ ...person })));
    setIsEditing(false);
    setIsDirty(false);
  }, [saved]);

  const save = useCallback(async () => {
    if (!saved) return;
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
    } catch (saveError) {
      setError(messageFrom(saveError));
      throw saveError;
    } finally {
      setSaving(false);
    }
  }, [client, draftAssignees, draftItems, saved]);

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
    ],
  );
}
