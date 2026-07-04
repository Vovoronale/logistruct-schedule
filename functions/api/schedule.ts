import type { SchedulePayload } from "../../src/types";
import { isAuthenticated } from "../lib/auth";
import { json, readJsonBody } from "../lib/http";
import { readSchedule } from "../lib/schedule-storage";
import { ValidationError, validateScheduleDraft } from "../lib/validation";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    return json(await readSchedule(env.DB));
  } catch (error) {
    console.error(JSON.stringify({ event: "schedule_read_failed", error: String(error) }));
    return json({ error: "Не вдалося завантажити графік" }, 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthenticated(request, env.SESSION_SECRET))) {
    return json({ error: "Потрібна авторизація" }, 401);
  }

  try {
    const draft = validateScheduleDraft(await readJsonBody(request));
    const currentSchedule = await readSchedule(env.DB);
    if (currentSchedule.revision !== draft.revision) {
      return json(
        { error: "Графік уже змінено в іншій вкладці", code: "REVISION_CONFLICT" },
        409,
      );
    }

    const nextNames = new Set(draft.assignees.map((person) => person.name));
    for (const existing of currentSchedule.assignees) {
      if (
        !nextNames.has(existing.name)
        && draft.items.some((item) => item.assignee === existing.name)
      ) {
        throw new ValidationError(
          `Спочатку замініть виконавця ${existing.name} у кресленнях`,
          undefined,
          "assignees",
        );
      }
    }

    const now = new Date().toISOString();
    const updateMeta = env.DB.prepare(
      `UPDATE schedule_meta
       SET revision = CASE WHEN revision = ? THEN revision + 1 ELSE NULL END,
           updated_at = ?
       WHERE id = 1`,
    ).bind(draft.revision, now);
    const insertHistory = env.DB.prepare(
      `INSERT OR REPLACE INTO schedule_history
       (revision, saved_at, snapshot_json)
       VALUES (?, ?, ?)`,
    ).bind(
      currentSchedule.revision,
      currentSchedule.updatedAt,
      JSON.stringify(currentSchedule),
    );
    const deleteDependencies = env.DB.prepare("DELETE FROM item_dependencies");
    const deleteItems = env.DB.prepare("DELETE FROM schedule_items");
    const deleteAssignees = env.DB.prepare("DELETE FROM assignees");
    const insertItem = env.DB.prepare(
      `INSERT INTO schedule_items
       (id, position, section, sheet_number, title, start_mode, start_date,
        duration_days, assignee, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const itemInserts = draft.items.map((item) =>
      insertItem.bind(
        item.id,
        item.position,
        item.section,
        item.sheetNumber,
        item.title,
        item.startMode,
        item.startDate,
        item.durationDays,
        item.assignee,
        item.status,
        item.createdAt,
        now,
      ),
    );
    const insertDependency = env.DB.prepare(
      `INSERT INTO item_dependencies (item_id, predecessor_id)
       VALUES (?, ?)`,
    );
    const dependencyInserts = draft.items.flatMap((item) =>
      item.predecessorIds.map((predecessorId) =>
        insertDependency.bind(item.id, predecessorId),
      ),
    );
    const insertAssignee = env.DB.prepare(
      `INSERT INTO assignees
       (id, name, color, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const assigneeInserts = draft.assignees.map((person) =>
      insertAssignee.bind(
        person.id,
        person.name,
        person.color,
        person.position,
        person.createdAt,
        now,
      ),
    );
    const pruneHistory = env.DB.prepare(
      `DELETE FROM schedule_history
       WHERE revision NOT IN (
         SELECT revision FROM schedule_history
         ORDER BY revision DESC
         LIMIT 10
       )`,
    );
    await env.DB.batch([
      updateMeta,
      insertHistory,
      deleteDependencies,
      deleteItems,
      deleteAssignees,
      ...assigneeInserts,
      ...itemInserts,
      ...dependencyInserts,
      pruneHistory,
    ]);

    return json({
      revision: draft.revision + 1,
      updatedAt: now,
      items: draft.items.map((item) => ({ ...item, updatedAt: now })),
      assignees: draft.assignees.map((person) => ({ ...person, updatedAt: now })),
    } satisfies SchedulePayload);
  } catch (error) {
    if (error instanceof ValidationError) {
      return json(
        { error: error.message, row: error.row, field: error.field },
        400,
      );
    }
    if (error instanceof Error && error.message === "BODY_TOO_LARGE") {
      return json({ error: "Запит завеликий" }, 413);
    }
    if (error instanceof Error && error.message === "INVALID_JSON") {
      return json({ error: "Некоректний JSON" }, 400);
    }
    if (String(error).includes("schedule_meta.revision")) {
      return json(
        { error: "Графік уже змінено в іншій вкладці", code: "REVISION_CONFLICT" },
        409,
      );
    }
    console.error(JSON.stringify({ event: "schedule_save_failed", error: String(error) }));
    return json({ error: "Не вдалося зберегти графік" }, 500);
  }
};
