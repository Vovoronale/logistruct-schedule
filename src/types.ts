export type ScheduleStatus = "planned" | "in_progress" | "completed";
export type ScheduleStartMode = "manual" | "dependencies";

export interface ScheduleItem {
  id: string;
  position: number;
  section: string;
  sheetNumber: number;
  title: string;
  startMode: ScheduleStartMode;
  startDate: string | null;
  durationDays: number | null;
  predecessorIds: string[];
  assignee: string | null;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Assignee {
  id: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulePayload {
  items: ScheduleItem[];
  assignees: Assignee[];
  revision: number;
  updatedAt: string;
}

export interface ScheduleDraft {
  revision: number;
  items: ScheduleItem[];
  assignees: Assignee[];
  holidays: string[];
}

export interface ScheduleHistoryEntry {
  revision: number;
  savedAt: string;
}

export type ScheduleHistorySnapshot = SchedulePayload;

export type ComparableItemField =
  | "position"
  | "section"
  | "sheetNumber"
  | "title"
  | "startMode"
  | "startDate"
  | "durationDays"
  | "predecessorIds"
  | "assignee"
  | "status";

export interface ItemComparison {
  id: string;
  fields: ComparableItemField[];
}

export interface ScheduleComparison {
  addedIds: string[];
  removedItems: ScheduleItem[];
  changed: ItemComparison[];
  rescheduledIds: string[];
}
