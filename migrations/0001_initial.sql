PRAGMA foreign_keys = ON;

CREATE TABLE schedule_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE schedule_items (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL UNIQUE CHECK (position >= 1),
  section TEXT NOT NULL CHECK (length(section) BETWEEN 1 AND 32),
  sheet_number INTEGER NOT NULL CHECK (sheet_number >= 1),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 500),
  start_date TEXT,
  duration_days INTEGER CHECK (duration_days IS NULL OR duration_days >= 1),
  assignee TEXT CHECK (assignee IS NULL OR length(assignee) <= 24),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_schedule_items_position ON schedule_items(position);
CREATE INDEX idx_schedule_items_section ON schedule_items(section);
CREATE INDEX idx_schedule_items_status ON schedule_items(status);

INSERT INTO schedule_meta (id, revision, updated_at) VALUES (1, 1, '2026-07-03T00:00:00Z');

INSERT INTO schedule_items VALUES ('drawing-001', 1, 'КЗ-0', 1, 'Заголовний лист. Основні вказівки. Перелік креслень.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-002', 2, 'КЗ-0', 2, 'Зведена вибірка матеріалів.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-003', 3, 'КЗ-0', 3, 'План котловану. Основні вказівки.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-004', 4, 'КЗ-0', 4, 'План фундаментів. Опалубка. Армування.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-005', 5, 'КЗ-0', 5, 'Фундаментна плита ФП-1. Опалубка. Армування.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-006', 6, 'КЗ-0', 6, 'Фундаментна плита ФП-2. Опалубка. Армування.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-007', 7, 'КЗ-0', 7, 'Фундаментна плита ФП-3. Опалубка. Армування.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-008', 8, 'КЗ-0', 8, 'План фундаментних балок на відмітці -3,300. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-009', 9, 'КЗ-0', 9, 'План стін підвалу. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-010', 10, 'КЗ-0', 10, 'План колон підвалу. Опалубка. Специфікація. Армування.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-011', 11, 'КЗ-0', 11, 'План перекриття над підвалом, будівля 1. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-012', 12, 'КЗ-0', 12, 'План підлог на відмітці -3,300. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-013', 13, 'КЗ-1', 1, 'Заголовний лист.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-014', 14, 'КЗ-1', 2, 'Вибірка матеріалів.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-015', 15, 'КЗ-1', 3, 'План колон першого поверху. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-016', 16, 'КЗ-1', 4, 'План колон другого поверху. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-017', 17, 'КЗ-1', 5, 'План колон третього поверху. Опалубка. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-018', 18, 'КЗ-1', 6, 'Розгортка рам по осі 1, осі 4, осі СБ та осі ТБ. Опалубка.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-019', 19, 'КЗ-1', 7, 'План перекриття над першим поверхом. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-020', 20, 'КЗ-1', 8, 'План перекриття над другим поверхом. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-021', 21, 'КЗ-1', 9, 'План перемичок. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-022', 22, 'КЗ-1', 10, 'Сходи СВ-1. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-023', 23, 'КЗ-1', 11, 'Сходи СВ-2. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-024', 24, 'КЗ-1', 12, 'Сходи СВ-3. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-025', 25, 'КЗ-1', 13, 'План залізобетонних стін першого поверху. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-026', 26, 'КЗ-1', 14, 'План залізобетонних стін другого поверху. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-027', 27, 'КМ1', 1, 'Загальні дані. Основні вказівки. Перелік креслень.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-028', 28, 'КМ1', 2, 'Зведена вибірка матеріалів.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-029', 29, 'КМ1', 3, 'План металевих балок покрівлі. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-030', 30, 'КМ1', 4, 'План металевих балок конструкції дашка над входом. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-031', 31, 'КЗ-2', 1, 'Заголовний лист. Основні вказівки. Перелік креслень.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-032', 32, 'КЗ-3', 2, 'Зведена вибірка матеріалів.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-033', 33, 'КЗ-4', 3, 'План колон першого поверху. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-034', 34, 'КЗ-5', 4, 'План колон другого поверху. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-035', 35, 'КЗ-6', 5, 'План колон третього поверху. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-036', 36, 'КЗ-7', 6, 'Розгортка по осі 1. Рама P-1. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-037', 37, 'КЗ-8', 7, 'Розгортка по осі 17. Рама P-2. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-038', 38, 'КЗ-9', 8, 'План перекриття над першим поверхом. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-039', 39, 'КЗ-10', 9, 'План перекриття над другим поверхом. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-040', 40, 'КЗ-11', 10, 'Сходи СВ-1. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-041', 41, 'КЗ-12', 11, 'Сходи СВ-2. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-042', 42, 'КЗ-13', 12, 'Монолітні конструкції трибун. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-043', 43, 'КЗ-14', 13, 'Конструкції парапетів. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-044', 44, 'КЗ-15', 14, 'Колони К-1, К-2, К-3, К-4. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-045', 45, 'КЗ-16', 15, 'Конструкція підлог першого поверху. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-046', 46, 'КМ2', 1, 'Заголовний лист. Основні вказівки. Перелік креслень.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-047', 47, 'КМ2', 2, 'Зведена вибірка матеріалів.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-048', 48, 'КМ2', 3, 'Фахверкові колони ФК-1. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-049', 49, 'КМ2', 4, 'План несучих елементів даху.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-050', 50, 'КМ2', 5, 'Ферма Ф-1. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-051', 51, 'КМ2', 6, 'Ферма Ф-2. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-052', 52, 'КМ2', 7, 'Ферма Ф-3. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-053', 53, 'КМ2', 8, 'Ферма Ф-4. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-054', 54, 'КМ2', 9, 'Балка Б-1. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-055', 55, 'КМ2', 12, 'Вітровий зв''язок ВЗ-1. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-056', 56, 'КМ2', 13, 'Вітровий зв''язок ВЗ-2. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-057', 57, 'КМ2', 14, 'Розпірки Р-1. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-058', 58, 'КМ2', 15, 'Металеві конструкції парапетів', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-059', 59, 'КЗ-3', 1, 'Заголовний лист. Основні вказівки. Перелік креслень.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-060', 60, 'КЗ-3', 2, 'Зведена вибірка матеріалів.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-061', 61, 'КЗ-3', 3, 'План котловану. Основні вказівки.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-062', 62, 'КЗ-3', 4, 'План фундаментів на відмітці -1,200. Опалубка. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-063', 63, 'КЗ-3', 5, 'План конструкції основи під бруківку. Опалубка. Армування. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-064', 64, 'КЗ-3', 6, 'Огорожа ОГ-1. План фундаментів. Опалубка. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-065', 65, 'КМ3', 1, 'Заголовний лист. Основні вказівки. Перелік креслень.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-066', 66, 'КМ4', 2, 'Зведена вибірка матеріалів.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-067', 67, 'КМ5', 3, 'План колон та стійок першого поверху. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
INSERT INTO schedule_items VALUES ('drawing-068', 68, 'КМ6', 4, 'План несучих елементів покрівлі над першим поверхом. Вузли. Специфікація.', NULL, NULL, NULL, 'planned', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z');
