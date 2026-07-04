ALTER TABLE schedule_items
ADD COLUMN start_mode TEXT NOT NULL DEFAULT 'manual'
CHECK (start_mode IN ('manual', 'dependencies'));

CREATE TABLE item_dependencies (
  item_id TEXT NOT NULL,
  predecessor_id TEXT NOT NULL,
  PRIMARY KEY (item_id, predecessor_id),
  CHECK (item_id <> predecessor_id),
  FOREIGN KEY (item_id) REFERENCES schedule_items(id) ON DELETE CASCADE,
  FOREIGN KEY (predecessor_id) REFERENCES schedule_items(id) ON DELETE RESTRICT
);

CREATE INDEX item_dependencies_predecessor_idx
ON item_dependencies(predecessor_id);

CREATE TABLE schedule_history (
  revision INTEGER PRIMARY KEY CHECK (revision >= 1),
  saved_at TEXT NOT NULL,
  snapshot_json TEXT NOT NULL
);
