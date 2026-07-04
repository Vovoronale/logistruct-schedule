import type { ScheduleHistoryEntry } from "../../../src/types";
import { json } from "../../lib/http";

interface HistoryRow {
  revision: number;
  saved_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const rows = await env.DB.prepare(
      `SELECT revision, saved_at
       FROM schedule_history
       ORDER BY revision DESC
       LIMIT 10`,
    ).all<HistoryRow>();
    return json(rows.results.map((row): ScheduleHistoryEntry => ({
      revision: row.revision,
      savedAt: row.saved_at,
    })));
  } catch (error) {
    console.error(JSON.stringify({
      event: "schedule_history_read_failed",
      error: String(error),
    }));
    return json({ error: "Не вдалося завантажити історію графіка" }, 500);
  }
};
