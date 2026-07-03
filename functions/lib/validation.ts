import type {
  ScheduleDraft,
  ScheduleItem,
  ScheduleStatus,
} from "../../src/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const ID = /^[A-Za-z0-9_-]{1,100}$/u;
const STATUSES = new Set<ScheduleStatus>([
  "planned",
  "in_progress",
  "completed",
]);

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
    startDate: optionalDate(value.startDate, row),
    durationDays: optionalInteger(value.durationDays, row),
    assignee: optionalText(value.assignee, row),
    status: value.status as ScheduleStatus,
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

  const items = value.items.map(validateItem);
  const ids = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (ids.has(item.id)) {
      throw new ValidationError("Ідентифікатори рядків не можуть повторюватися", index + 1, "id");
    }
    ids.add(item.id);
  }
  return { revision: Number(value.revision), items };
}
