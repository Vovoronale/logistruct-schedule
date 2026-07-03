import type { ScheduleDraft, SchedulePayload } from "../types";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "same-origin",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  } & T;
  if (!response.ok) {
    throw new ApiError(body.error ?? "Помилка з’єднання", response.status, body.code);
  }
  return body;
}

export interface ScheduleClient {
  getSchedule(): Promise<SchedulePayload>;
  getSession(): Promise<boolean>;
  login(password: string): Promise<void>;
  logout(): Promise<void>;
  save(draft: ScheduleDraft): Promise<SchedulePayload>;
}

export const scheduleClient: ScheduleClient = {
  getSchedule: () => requestJson<SchedulePayload>("/api/schedule"),
  async getSession() {
    const result = await requestJson<{ authenticated: boolean }>(
      "/api/auth/session",
    );
    return result.authenticated;
  },
  async login(password) {
    await requestJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },
  async logout() {
    await requestJson("/api/auth/logout", { method: "POST" });
  },
  save: (draft) =>
    requestJson<SchedulePayload>("/api/schedule", {
      method: "PUT",
      body: JSON.stringify(draft),
    }),
};
