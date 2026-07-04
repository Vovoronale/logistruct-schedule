import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

vi.mock("./hooks/useToday", () => ({ useToday: () => "2026-07-07" }));

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
      startDate: "2026-07-03",
      durationDays: 5,
      assignee: null,
      status: "planned",
      createdAt: "2026-07-03T00:00:00Z",
      updatedAt: "2026-07-03T00:00:00Z",
    },
    {
      id: "drawing-002",
      position: 2,
      section: "КМ2",
      sheetNumber: 1,
      title: "План металевих конструкцій",
      startDate: "2026-07-03",
      durationDays: 10,
      assignee: null,
      status: "completed",
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

  it("renders sheet, section and whole-schedule progress", async () => {
    render(<App />);

    expect(
      await screen.findByRole("columnheader", { name: "Виконання" }),
    ).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Виконання листа 1" }),
    ).toHaveAttribute("value", "40");
    expect(
      screen.getByRole("heading", { name: "Загальний прогрес" }),
    ).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Прогрес розділу КЗ-0" }),
    ).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Прогрес розділу КМ2" }),
    ).toBeVisible();
  });

  it("keeps whole-schedule summaries when the table is filtered", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(schedule.items[0].title);

    await user.type(
      screen.getByRole("textbox", { name: "Пошук креслення" }),
      schedule.items[0].title,
    );

    expect(
      screen.getByRole("progressbar", { name: "Прогрес розділу КЗ-0" }),
    ).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Прогрес розділу КМ2" }),
    ).toBeVisible();
    expect(screen.queryByText(schedule.items[1].title)).not.toBeInTheDocument();
  });

  it("keeps editing actions hidden from public visitors", async () => {
    render(<App />);
    expect(await screen.findByRole("button", { name: "Редагувати" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Додати рядок" })).not.toBeInTheDocument();
  });
});
