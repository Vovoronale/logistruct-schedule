import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

const schedule = {
  revision: 1,
  updatedAt: "2026-07-03T00:00:00Z",
  assignees: [],
  items: [
    {
      id: "drawing-001",
      position: 1,
      section: "КЗ-0",
      sheetNumber: 1,
      title: "Заголовний лист. Основні вказівки. Перелік креслень.",
      startMode: "manual",
      startDate: null,
      durationDays: null,
      predecessorIds: [],
      assignee: null,
      status: "planned",
      createdAt: "2026-07-03T00:00:00Z",
      updatedAt: "2026-07-03T00:00:00Z",
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.href
          : input;
      const body = url.includes("/api/auth/session")
        ? { authenticated: false }
        : schedule;
      return Promise.resolve(new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    }),
  );
});

describe("schedule application", () => {
  it("renders useful schedule columns and omits technical Excel columns", async () => {
    render(<App />);
    expect(await screen.findByText("Найменування креслення")).toBeVisible();
    expect(screen.getByText(schedule.items[0].title)).toBeVisible();
    expect(screen.queryByText("К-ть залежностей")).not.toBeInTheDocument();
    expect(screen.queryByText("Номери попередніх робіт")).not.toBeInTheDocument();
  });

  it("keeps editing actions hidden from public visitors", async () => {
    render(<App />);
    expect(await screen.findByRole("button", { name: "Редагувати" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Додати рядок" })).not.toBeInTheDocument();
  });
});
