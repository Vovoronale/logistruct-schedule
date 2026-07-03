import type { Assignee, ScheduleItem, SchedulePayload } from "../../src/types";
import { isAuthenticated } from "../lib/auth";
import { json, readJsonBody } from "../lib/http";
import { ValidationError, validateScheduleDraft } from "../lib/validation";

interface MetaRow {
  revision: number;
  updated_at: string;
}

interface ScheduleRow {
  id: string;
  position: number;
  section: string;
  sheet_number: number;
  title: string;
  start_date: string | null;
  duration_days: number | null;
  assignee: string | null;
  status: ScheduleItem["status"];
  created_at: string;
  updated_at: string;
}

interface AssigneeRow {
  id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ScheduleRow): ScheduleItem {
  return {
    id: row.id,
    position: row.position,
    section: row.section,
    sheetNumber: row.sheet_number,
    title: row.title,
    startDate: row.start_date,
    durationDays: row.duration_days,
    assignee: row.assignee,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssignee(row: AssigneeRow): Assignee {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function readSchedule(db: D1Database): Promise<SchedulePayload> {
  const [meta, rows, assigneeRows] = await Promise.all([
    db
      .prepare("SELECT revision, updated_at FROM schedule_meta WHERE id = 1")
      .first<MetaRow>(),
    db
      .prepare(
        `SELECT id, position, section, sheet_number, title, start_date,
                duration_days, assignee, status, created_at, updated_at
         FROM schedule_items ORDER BY position ASC`,
      )
      .all<ScheduleRow>(),
    db
      .prepare(
        `SELECT id, name, color, position, created_at, updated_at
         FROM assignees ORDER BY position ASC`,
      )
      .all<AssigneeRow>(),
  ]);
  if (!meta) throw new Error("SCHEDULE_META_MISSING");
  return {
    revision: meta.revision,
    updatedAt: meta.updated_at,
    items: rows.results.map(mapRow),
    assignees: assigneeRows.results.map(mapAssignee),
  };
}

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
    const current = await env.DB.prepare(
      "SELECT revision, updated_at FROM schedule_meta WHERE id = 1",
    ).first<MetaRow>();
    if (!current) throw new Error("SCHEDULE_META_MISSING");
    if (current.revision !== draft.revision) {
      return json(
        { error: "Графік уже змінено в іншій вкладці", code: "REVISION_CONFLICT" },
        409,
      );
    }

    const currentAssignees = await env.DB.prepare(
      "SELECT name FROM assignees ORDER BY position ASC",
    ).all<Pick<AssigneeRow, "name">>();
    const nextNames = new Set(draft.assignees.map((person) => person.name));
    for (const existing of currentAssignees.results) {
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
    const deleteItems = env.DB.prepare("DELETE FROM schedule_items");
    const deleteAssignees = env.DB.prepare("DELETE FROM assignees");
    const insertItem = env.DB.prepare(
      `INSERT INTO schedule_items
       (id, position, section, sheet_number, title, start_date, duration_days,
        assignee, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const itemInserts = draft.items.map((item) =>
      insertItem.bind(
        item.id,
        item.position,
        item.section,
        item.sheetNumber,
        item.title,
        item.startDate,
        item.durationDays,
        item.assignee,
        item.status,
        item.createdAt,
        now,
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
    await env.DB.batch([
      updateMeta,
      deleteItems,
      deleteAssignees,
      ...assigneeInserts,
      ...itemInserts,
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
