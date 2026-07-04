import type {
  Assignee,
  ScheduleDraft,
  ScheduleItem,
  ScheduleStartMode,
  ScheduleStatus,
} from "../../src/types";
import { DependencyError, recalculateSchedule } from "../../src/lib/dependencies";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const ID = /^[A-Za-z0-9_-]{1,100}$/u;
const HEX_COLOR = /^#[0-9A-F]{6}$/iu;
const STATUSES = new Set<ScheduleStatus>([
  "planned",
  "in_progress",
  "completed",
]);
const START_MODES = new Set<ScheduleStartMode>(["manual", "dependencies"]);

export class ValidationError extends Error {
  readonly field?: string;
  readonly row?: number;

  constructor(message: string, row?: number, field?: string) {
    super(message);
    this.name = "ValidationError";
    this.row = row;
    this.field = field;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(
  value: unknown,
  row: number,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new ValidationError("Обов’язкове текстове поле", row, field);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new ValidationError(`Довжина має бути від 1 до ${maxLength}`, row, field);
  }
  return normalized;
}

function positiveInteger(value: unknown, row: number, field: string): number {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new ValidationError("Потрібне додатне ціле число", row, field);
  }
  return Number(value);
}

function optionalDate(value: unknown, row: number): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    throw new ValidationError("Некоректна дата", row, "startDate");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== value) {
    throw new ValidationError("Некоректна дата", row, "startDate");
  }
  return value;
}

function optionalInteger(value: unknown, row: number): number | null {
  if (value === null || value === "") return null;
  return positiveInteger(value, row, "durationDays");
}

function optionalText(value: unknown, row: number): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > 24) {
    throw new ValidationError("Код виконавця має містити до 24 символів", row, "assignee");
  }
  return value.trim() || null;
}

function timestamp(value: unknown, row: number, field: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new ValidationError("Некоректна службова дата", row, field);
  }
  return value;
}

function startMode(value: unknown, row: number): ScheduleStartMode {
  if (value === undefined) return "manual";
  if (typeof value !== "string" || !START_MODES.has(value as ScheduleStartMode)) {
    throw new ValidationError("Некоректний спосіб початку", row, "startMode");
  }
  return value as ScheduleStartMode;
}

function predecessorIds(value: unknown, row: number): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 1_000) {
    throw new ValidationError(
      "Некоректний список залежностей",
      row,
      "predecessorIds",
    );
  }
  return value.map((id) => {
    if (typeof id !== "string" || !ID.test(id)) {
      throw new ValidationError(
        "Некоректна пов’язана робота",
        row,
        "predecessorIds",
      );
    }
    return id;
  });
}

function validateItem(value: unknown, index: number): ScheduleItem {
  const row = index + 1;
  if (!isRecord(value)) throw new ValidationError("Некоректний рядок", row);
  const id = requiredText(value.id, row, "id", 100);
  if (!ID.test(id)) throw new ValidationError("Некоректний ідентифікатор", row, "id");
  if (typeof value.status !== "string" || !STATUSES.has(value.status as ScheduleStatus)) {
    throw new ValidationError("Некоректний статус", row, "status");
  }

  return {
    id,
    position: row,
    section: requiredText(value.section, row, "section", 32),
    sheetNumber: positiveInteger(value.sheetNumber, row, "sheetNumber"),
    title: requiredText(value.title, row, "title", 500),
    startMode: startMode(value.startMode, row),
    startDate: optionalDate(value.startDate, row),
    durationDays: optionalInteger(value.durationDays, row),
    predecessorIds: predecessorIds(value.predecessorIds, row),
    assignee: optionalText(value.assignee, row),
    status: value.status as ScheduleStatus,
    createdAt: timestamp(value.createdAt, row, "createdAt"),
    updatedAt: timestamp(value.updatedAt, row, "updatedAt"),
  };
}

function validateAssignee(value: unknown, index: number): Assignee {
  const row = index + 1;
  if (!isRecord(value)) {
    throw new ValidationError("Некоректний виконавець", row);
  }
  const id = requiredText(value.id, row, "id", 100);
  if (!ID.test(id)) {
    throw new ValidationError("Некоректний ідентифікатор", row, "id");
  }
  const color = requiredText(value.color, row, "color", 7).toUpperCase();
  if (!HEX_COLOR.test(color)) {
    throw new ValidationError("Колір має бути у форматі #RRGGBB", row, "color");
  }
  return {
    id,
    name: requiredText(value.name, row, "name", 24),
    color,
    position: row,
    createdAt: timestamp(value.createdAt, row, "createdAt"),
    updatedAt: timestamp(value.updatedAt, row, "updatedAt"),
  };
}

export function validateScheduleDraft(value: unknown): ScheduleDraft {
  if (!isRecord(value)) throw new ValidationError("Некоректний запит");
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) {
    throw new ValidationError("Некоректна версія графіка", undefined, "revision");
  }
  if (!Array.isArray(value.items) || value.items.length > 1_000) {
    throw new ValidationError("Графік може містити до 1000 рядків", undefined, "items");
  }
  if (!Array.isArray(value.assignees) || value.assignees.length > 200) {
    throw new ValidationError("Довідник може містити до 200 виконавців", undefined, "assignees");
  }

  const items = value.items.map(validateItem);
  const ids = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (ids.has(item.id)) {
      throw new ValidationError("Ідентифікатори рядків не можуть повторюватися", index + 1, "id");
    }
    ids.add(item.id);
  }
  const assignees = value.assignees.map(validateAssignee);
  const assigneeIds = new Set<string>();
  const assigneeNames = new Set<string>();
  for (const [index, assignee] of assignees.entries()) {
    if (assigneeIds.has(assignee.id)) {
      throw new ValidationError("Ідентифікатори виконавців не можуть повторюватися", index + 1, "id");
    }
    const nameKey = assignee.name.toLocaleLowerCase("uk-UA");
    if (assigneeNames.has(nameKey)) {
      throw new ValidationError("Назви виконавців не можуть повторюватися", index + 1, "name");
    }
    assigneeIds.add(assignee.id);
    assigneeNames.add(nameKey);
  }
  let recalculated: ScheduleItem[];
  try {
    recalculated = recalculateSchedule(items);
  } catch (error) {
    if (!(error instanceof DependencyError)) throw error;
    const row = items.findIndex((item) => item.id === error.itemId) + 1;
    throw new ValidationError(
      error.message,
      row || undefined,
      "predecessorIds",
    );
  }
  return { revision: Number(value.revision), items: recalculated, assignees };
}
