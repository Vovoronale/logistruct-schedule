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
      startMode: "manual",
      startDate: "2026-07-03",
      durationDays: 5,
      predecessorIds: [],
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
      startMode: "manual",
      startDate: "2026-07-03",
      durationDays: 10,
      predecessorIds: [],
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
  it("identifies the company and construction object in the header", () => {
    render(<App />);

    expect(screen.getByText("LogiStruct")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Графік виконання креслень" })).toBeVisible();
    expect(screen.getByText("Об’єкт: Аквапарк «Став»")).toBeVisible();
  });

  it("renders useful schedule columns and omits technical Excel columns", async () => {
    render(<App />);
    expect(await screen.findByText("Найменування креслення")).toBeVisible();
    expect(screen.getByText(schedule.items[0].title)).toBeVisible();
    expect(screen.queryByText("К-ть залежностей")).not.toBeInTheDocument();
    expect(screen.queryByText("Номери попередніх робіт")).not.toBeInTheDocument();
  });

  it("renders sheet, section and whole-schedule progress", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByRole("columnheader", { name: "Виконання" }),
    ).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Виконання листа 1" }),
    ).toHaveAttribute("value", "40");
    const progressButton = screen.getByRole("button", { name: /Прогрес/ });
    expect(progressButton).toHaveTextContent("80,0%");
    await user.click(progressButton);
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

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Статус" }),
      "planned",
    );
    await user.click(screen.getByRole("button", { name: /Прогрес/ }));

    expect(
      screen.getByRole("progressbar", { name: "Прогрес розділу КЗ-0" }),
    ).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Прогрес розділу КМ2" }),
    ).toBeVisible();
    expect(screen.queryByText(schedule.items[1].title)).not.toBeInTheDocument();
  });

  it("shows only one information panel and closes it with Escape", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(schedule.items[0].title);

    await user.click(screen.getByRole("button", { name: /Прогрес/ }));
    expect(screen.getByRole("heading", { name: "Загальний прогрес" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Виконавці" }));
    expect(screen.queryByRole("heading", { name: "Загальний прогрес" })).not.toBeInTheDocument();
    expect(document.querySelector("#assignees-panel")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(document.querySelector("#assignees-panel")).not.toBeInTheDocument();
  });

  it("uses a full-height workspace without a persistent footer", async () => {
    render(<App />);
    await screen.findByText(schedule.items[0].title);

    expect(document.querySelector(".workspace-main")).toBeInTheDocument();
    expect(document.querySelector(".workspace-content")).toBeInTheDocument();
    expect(document.querySelector(".app-footer")).not.toBeInTheDocument();
  });

  it("keeps editing actions hidden from public visitors", async () => {
    render(<App />);
    expect(await screen.findByRole("button", { name: "Редагувати" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Додати рядок" })).not.toBeInTheDocument();
  });

  it("loads and displays a retained schedule comparison", async () => {
    const user = userEvent.setup();
    const current = {
      ...schedule,
      revision: 2,
      items: [{
        ...schedule.items[0],
        startDate: "2026-07-08",
        durationDays: 2,
      }],
    };
    const previous = {
      ...current,
      revision: 1,
      updatedAt: "2026-07-02T00:00:00Z",
      items: [
        { ...current.items[0], startDate: "2026-07-06" },
        {
          ...current.items[0],
          id: "drawing-removed",
          position: 2,
          title: "Видалене креслення",
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.href
          : input;
      const body = url.includes("/api/auth/session")
        ? { authenticated: false }
        : url.endsWith("/api/schedule/history/1")
          ? previous
          : url.endsWith("/api/schedule/history")
            ? [{ revision: 1, savedAt: previous.updatedAt }]
            : current;
      return Promise.resolve(new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    }));
    render(<App />);
    await screen.findByText(current.items[0].title);

    await user.click(screen.getByRole("button", { name: "Порівняти" }));
    await user.selectOptions(
      await screen.findByLabelText("Версія для порівняння"),
      "1",
    );

    expect(await screen.findByText("Видалено: 1")).toBeVisible();
    expect(screen.getByText("Видалене креслення")).toBeVisible();
    expect(screen.getAllByLabelText(/Попередня версія:/).length).toBeGreaterThan(0);
  });
});
