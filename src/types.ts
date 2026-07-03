export type ScheduleStatus = "planned" | "in_progress" | "completed";

export interface ScheduleItem {
  id: string;
  position: number;
  section: string;
  sheetNumber: number;
  title: string;
  startDate: string | null;
  durationDays: number | null;
  assignee: string | null;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulePayload {
  items: ScheduleItem[];
  revision: number;
  updatedAt: string;
}

export interface ScheduleDraft {
  revision: number;
  items: ScheduleItem[];
}
