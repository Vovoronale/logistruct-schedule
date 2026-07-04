import { Buffer } from "node:buffer";

const DAY_MS = 86_400_000;

const DURATIONS = [1, 2, 3, 5, 8, 10];

const DEPENDENCY_PAIRS = [
  ["drawing-019", "drawing-018"],
  ["drawing-020", "drawing-019"],
  ["drawing-021", "drawing-019"],
  ["drawing-022", "drawing-020"],
  ["drawing-022", "drawing-021"],
  ["drawing-050", "drawing-049"],
  ["drawing-051", "drawing-050"],
  ["drawing-052", "drawing-050"],
  ["drawing-053", "drawing-051"],
  ["drawing-053", "drawing-052"],
  ["drawing-054", "drawing-053"],
  ["drawing-063", "drawing-061"],
  ["drawing-063", "drawing-062"],
  ["drawing-064", "drawing-063"],
];

function parseDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime())
    || date.toISOString().slice(0, 10) !== isoDate
  ) {
    throw new Error(`INVALID_DATE:${isoDate}`);
  }
  return date;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function timestamp(isoDate, hour = 12) {
  return `${isoDate}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

export function addCalendarDays(isoDate, days) {
  return new Date(parseDate(isoDate).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function addWorkingDays(isoDate, days) {
  let cursor = parseDate(isoDate);
  let remaining = days;
  while (remaining > 0) {
    cursor = new Date(cursor.getTime() + DAY_MS);
    if (![0, 6].includes(cursor.getUTCDay())) remaining -= 1;
  }
  return cursor.toISOString().slice(0, 10);
}

function mapAssignee(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function itemStatus(position) {
  if (position <= 17) return "completed";
  if (position <= 34) return "in_progress";
  return "planned";
}

function itemStartDate(position, anchorDate) {
  if (position <= 17) return addCalendarDays(anchorDate, -60 + position * 2);
  if (position <= 34) return addCalendarDays(anchorDate, -(position % 7) - 1);
  if (position <= 62) return addCalendarDays(anchorDate, (position - 34) * 2);
  return null;
}

function mapItem(row, assignees, anchorDate) {
  const position = row.position;
  const updatedAt = timestamp(anchorDate);
  return {
    id: row.id,
    position,
    section: row.section,
    sheetNumber: row.sheet_number,
    title: row.title,
    startMode: "manual",
    startDate: itemStartDate(position, anchorDate),
    durationDays: position <= 64 ? DURATIONS[(position - 1) % DURATIONS.length] : null,
    predecessorIds: [],
    assignee: position <= 60 ? assignees[(position - 1) % assignees.length].name : null,
    status: itemStatus(position),
    createdAt: row.created_at,
    updatedAt,
  };
}

function applyDependencies(items) {
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const [itemId, predecessorId] of DEPENDENCY_PAIRS) {
    const item = byId.get(itemId);
    if (!item) throw new Error(`MISSING_ITEM:${itemId}`);
    item.startMode = "dependencies";
    item.predecessorIds.push(predecessorId);
  }

  for (const item of items) {
    if (item.startMode !== "dependencies") continue;
    const finishes = item.predecessorIds.map((predecessorId) => {
      const predecessor = byId.get(predecessorId);
      if (!predecessor?.startDate || !predecessor.durationDays) {
        throw new Error(`INCOMPLETE_PREDECESSOR:${predecessorId}`);
      }
      return addWorkingDays(predecessor.startDate, predecessor.durationDays);
    });
    item.startDate = finishes.sort().at(-1) ?? null;
  }
}

function historicalItem(items, id) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`MISSING_ITEM:${id}`);
  return item;
}

function createHistory(items, assignees, anchorDate) {
  const revisions = [2, 3, 4].map((revision) => ({
    revision,
    savedAt: timestamp(addCalendarDays(anchorDate, revision - 5), 9),
    updatedAt: timestamp(addCalendarDays(anchorDate, revision - 5), 9),
    items: clone(items),
    assignees: clone(assignees),
  }));

  const revision2 = revisions[0];
  revision2.items = revision2.items.filter((item) => item.id !== "drawing-068");
  revision2.items.push({
    ...clone(historicalItem(items, "drawing-068")),
    id: "test-removed-001",
    title: "Тестове видалене креслення",
    startMode: "manual",
    predecessorIds: [],
  });
  historicalItem(revision2.items, "drawing-001").status = "planned";
  historicalItem(revision2.items, "drawing-019").assignee = assignees[1].name;

  const revision3 = revisions[1];
  historicalItem(revision3.items, "drawing-001").status = "in_progress";
  historicalItem(revision3.items, "drawing-050").startDate = addCalendarDays(
    historicalItem(revision3.items, "drawing-050").startDate,
    -4,
  );

  const revision4 = revisions[2];
  historicalItem(revision4.items, "drawing-018").status = "planned";
  historicalItem(revision4.items, "drawing-035").assignee = assignees[5].name;

  return revisions;
}

export function createDemoFixture(baseItems, assigneeRows, anchorDate) {
  if (baseItems.length !== 68) throw new Error("EXPECTED_68_BASE_ITEMS");
  if (assigneeRows.length !== 17) throw new Error("EXPECTED_17_ASSIGNEES");
  parseDate(anchorDate);

  const assignees = assigneeRows.map(mapAssignee);
  const items = baseItems
    .map((row) => mapItem(row, assignees, anchorDate))
    .sort((left, right) => left.position - right.position);
  applyDependencies(items);

  const fixture = {
    revision: 5,
    updatedAt: timestamp(anchorDate),
    items,
    assignees,
    dependencies: DEPENDENCY_PAIRS.map(([itemId, predecessorId]) => ({
      itemId,
      predecessorId,
    })),
    history: createHistory(items, assignees, anchorDate),
  };
  validateFixture(fixture);
  return fixture;
}

export function validateFixture(fixture) {
  if (fixture.revision !== 5) throw new Error("INVALID_CURRENT_REVISION");
  if (fixture.items.length !== 68) throw new Error("EXPECTED_68_FIXTURE_ITEMS");
  if (fixture.assignees.length !== 17) throw new Error("EXPECTED_17_FIXTURE_ASSIGNEES");
  if (fixture.history.length !== 3) throw new Error("EXPECTED_3_HISTORY_REVISIONS");

  const itemsById = new Map();
  for (const item of fixture.items) {
    if (itemsById.has(item.id)) throw new Error(`DUPLICATE_ITEM:${item.id}`);
    itemsById.set(item.id, item);
  }

  const knownAssignees = new Set(fixture.assignees.map((assignee) => assignee.name));
  const usedAssignees = new Set(
    fixture.items.map((item) => item.assignee).filter(Boolean),
  );
  if (usedAssignees.size !== knownAssignees.size) {
    throw new Error("NOT_ALL_ASSIGNEES_USED");
  }
  for (const name of usedAssignees) {
    if (!knownAssignees.has(name)) throw new Error(`UNKNOWN_ASSIGNEE:${name}`);
  }

  const statuses = new Set(fixture.items.map((item) => item.status));
  for (const status of ["planned", "in_progress", "completed"]) {
    if (!statuses.has(status)) throw new Error(`MISSING_STATUS:${status}`);
  }

  const seenEdges = new Set();
  for (const edge of fixture.dependencies) {
    const item = itemsById.get(edge.itemId);
    const predecessor = itemsById.get(edge.predecessorId);
    if (!item || !predecessor) throw new Error("MISSING_DEPENDENCY_ITEM");
    if (predecessor.position >= item.position) throw new Error("CYCLIC_DEPENDENCY_ORDER");
    const key = `${edge.itemId}\0${edge.predecessorId}`;
    if (seenEdges.has(key)) throw new Error("DUPLICATE_DEPENDENCY");
    seenEdges.add(key);
    if (
      item.startMode !== "dependencies"
      || !item.predecessorIds.includes(edge.predecessorId)
    ) {
      throw new Error("DEPENDENCY_ITEM_MISMATCH");
    }
  }

  const historyRevisions = fixture.history.map((snapshot) => snapshot.revision);
  if (historyRevisions.join(",") !== "2,3,4") {
    throw new Error("INVALID_HISTORY_REVISIONS");
  }
  for (const snapshot of fixture.history) {
    if (snapshot.assignees.length !== 17) {
      throw new Error("INCOMPLETE_HISTORY_ASSIGNEES");
    }
  }
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlInteger(value) {
  if (value === null || value === undefined) return "NULL";
  if (!Number.isInteger(value)) throw new Error(`INVALID_SQL_INTEGER:${value}`);
  return String(value);
}

function snapshotJson(snapshot) {
  return JSON.stringify({
    revision: snapshot.revision,
    updatedAt: snapshot.updatedAt,
    items: snapshot.items,
    assignees: snapshot.assignees,
  });
}

function fixtureStatements(fixture) {
  validateFixture(fixture);
  const lines = [
    "DELETE FROM item_dependencies;",
    "DELETE FROM schedule_history;",
    "UPDATE schedule_items SET position = position + 1000;",
  ];

  for (const item of fixture.items) {
    lines.push(
      `UPDATE schedule_items
SET position = ${sqlInteger(item.position)},
    section = ${sqlString(item.section)},
    sheet_number = ${sqlInteger(item.sheetNumber)},
    title = ${sqlString(item.title)},
    start_mode = ${sqlString(item.startMode)},
    start_date = ${sqlString(item.startDate)},
    duration_days = ${sqlInteger(item.durationDays)},
    assignee = ${sqlString(item.assignee)},
    status = ${sqlString(item.status)},
    created_at = ${sqlString(item.createdAt)},
    updated_at = ${sqlString(item.updatedAt)}
WHERE id = ${sqlString(item.id)};`,
    );
  }

  for (const edge of fixture.dependencies) {
    lines.push(
      `INSERT INTO item_dependencies (item_id, predecessor_id)
VALUES (${sqlString(edge.itemId)}, ${sqlString(edge.predecessorId)});`,
    );
  }

  for (const snapshot of fixture.history) {
    lines.push(
      `INSERT INTO schedule_history (revision, saved_at, snapshot_json)
VALUES (${sqlInteger(snapshot.revision)}, ${sqlString(snapshot.savedAt)}, ${sqlString(snapshotJson(snapshot))});`,
    );
  }

  lines.push(
    `UPDATE schedule_meta
SET revision = ${sqlInteger(fixture.revision)},
    updated_at = ${sqlString(fixture.updatedAt)}
WHERE id = 1;`,
  );
  return lines;
}

function renderBatch(statements) {
  return `${[
    "PRAGMA foreign_keys = ON;",
    ...statements,
  ].join("\n")}\n`;
}

export function renderFixtureSql(fixture) {
  return renderBatch(fixtureStatements(fixture));
}

export function renderFixtureSqlChunks(fixture, maxBytes = 80_000) {
  if (!Number.isInteger(maxBytes) || maxBytes < 1) {
    throw new Error("INVALID_MAX_SQL_BYTES");
  }
  const chunks = [];
  let current = [];
  for (const statement of fixtureStatements(fixture)) {
    const candidate = renderBatch([...current, statement]);
    if (Buffer.byteLength(candidate, "utf8") > maxBytes && current.length > 0) {
      chunks.push(renderBatch(current));
      current = [statement];
      if (Buffer.byteLength(renderBatch(current), "utf8") > maxBytes) {
        throw new Error("SQL_STATEMENT_EXCEEDS_BATCH_LIMIT");
      }
    } else {
      current.push(statement);
    }
  }
  if (current.length > 0) chunks.push(renderBatch(current));
  return chunks;
}
