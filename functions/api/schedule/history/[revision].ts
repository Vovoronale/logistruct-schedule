import { json } from "../../../lib/http";
import { parseSnapshot } from "../../../lib/schedule-storage";

interface SnapshotRow {
  snapshot_json: string;
}

function revisionParam(value: string | string[]): number | null {
  if (Array.isArray(value) || !/^\d+$/u.test(value)) return null;
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision > 0 ? revision : null;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const revision = revisionParam(params.revision);
  if (revision === null) {
    return json({ error: "Некоректна версія графіка" }, 400);
  }
  try {
    const row = await env.DB.prepare(
      `SELECT snapshot_json
       FROM schedule_history
       WHERE revision = ?`,
    ).bind(revision).first<SnapshotRow>();
    if (!row) return json({ error: "Версію графіка не знайдено" }, 404);
    return json(parseSnapshot(row.snapshot_json));
  } catch (error) {
    console.error(JSON.stringify({
      event: "schedule_history_snapshot_read_failed",
      revision,
      error: String(error),
    }));
    return json({ error: "Не вдалося завантажити версію графіка" }, 500);
  }
};
