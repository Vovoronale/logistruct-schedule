import type {
  Assignee,
  ScheduleHistorySnapshot,
  ScheduleItem,
  SchedulePayload,
  ScheduleStartMode,
} from "../../src/types";

export interface MetaRow {
  revision: number;
  updated_at: string;
}

interface ScheduleRow {
  id: string;
  position: number;
  section: string;
  sheet_number: number;
  title: string;
  start_mode: ScheduleStartMode;
  start_date: string | null;
  duration_days: number | null;
  assignee: string | null;
  status: ScheduleItem["status"];
  created_at: string;
  updated_at: string;
}

export interface AssigneeRow {
  id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

interface DependencyRow {
  item_id: string;
  predecessor_id: string;
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

export async function readSchedule(db: D1Database): Promise<SchedulePayload> {
  const [meta, rows, assigneeRows, dependencyRows] = await Promise.all([
    db
      .prepare("SELECT revision, updated_at FROM schedule_meta WHERE id = 1")
      .first<MetaRow>(),
    db
      .prepare(
        `SELECT id, position, section, sheet_number, title, start_mode,
                start_date, duration_days, assignee, status, created_at, updated_at
         FROM schedule_items ORDER BY position ASC`,
      )
      .all<ScheduleRow>(),
    db
      .prepare(
        `SELECT id, name, color, position, created_at, updated_at
         FROM assignees ORDER BY position ASC`,
      )
      .all<AssigneeRow>(),
    db
      .prepare(
        `SELECT item_id, predecessor_id
         FROM item_dependencies ORDER BY item_id, predecessor_id`,
      )
      .all<DependencyRow>(),
  ]);
  if (!meta) throw new Error("SCHEDULE_META_MISSING");

  const predecessorsByItem = new Map<string, string[]>();
  for (const edge of dependencyRows.results) {
    predecessorsByItem.set(edge.item_id, [
      ...(predecessorsByItem.get(edge.item_id) ?? []),
      edge.predecessor_id,
    ]);
  }

  return {
    revision: meta.revision,
    updatedAt: meta.updated_at,
    items: rows.results.map((row) => ({
      id: row.id,
      position: row.position,
      section: row.section,
      sheetNumber: row.sheet_number,
      title: row.title,
      startMode: row.start_mode,
      startDate: row.start_date,
      durationDays: row.duration_days,
      predecessorIds: predecessorsByItem.get(row.id) ?? [],
      assignee: row.assignee,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    assignees: assigneeRows.results.map(mapAssignee),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSnapshot(snapshotJson: string): ScheduleHistorySnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshotJson);
  } catch {
    throw new Error("INVALID_HISTORY_SNAPSHOT");
  }
  if (
    !isRecord(parsed)
    || !Number.isInteger(parsed.revision)
    || typeof parsed.updatedAt !== "string"
    || !Array.isArray(parsed.items)
    || !Array.isArray(parsed.assignees)
  ) {
    throw new Error("INVALID_HISTORY_SNAPSHOT");
  }
  return parsed as unknown as ScheduleHistorySnapshot;
}
