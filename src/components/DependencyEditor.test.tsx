import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ScheduleItem } from "../types";
import { DependencyEditor } from "./DependencyEditor";

const row = (
  id: string,
  position: number,
  patch: Partial<ScheduleItem> = {},
): ScheduleItem => ({
  id,
  position,
  section: "КЗ",
  sheetNumber: position,
  title: `Робота ${id}`,
  startMode: "manual",
  startDate: "2026-07-06",
  durationDays: 1,
  predecessorIds: [],
  assignee: null,
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
  ...patch,
});

describe("DependencyEditor", () => {
  it("switches from a manual date to dependency mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const item = row("b", 2);
    render(<DependencyEditor item={item} items={[row("a", 1), item]} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Спосіб початку роботи №2"), "dependencies");

    expect(onChange).toHaveBeenCalledWith({
      startMode: "dependencies",
      startDate: null,
      predecessorIds: [],
    });
  });

  it("emits stable ids from a multiple-work picker", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const item = row("c", 3, { startMode: "dependencies" });
    render(
      <DependencyEditor
        item={item}
        items={[row("a", 1), row("b", 2), item]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByText("Обрати роботи"));
    await user.click(screen.getByLabelText("№1 — Робота a"));
    await user.click(screen.getByLabelText("№2 — Робота b"));

    expect(onChange).toHaveBeenNthCalledWith(1, { predecessorIds: ["a"] });
    expect(onChange).toHaveBeenNthCalledWith(2, { predecessorIds: ["b"] });
  });

  it("prioritizes dependency candidates with the same assignee", async () => {
    const user = userEvent.setup();
    const item = row("c", 3, {
      startMode: "dependencies",
      assignee: "Олена",
    });
    render(
      <DependencyEditor
        item={item}
        items={[
          row("a", 1, { assignee: "Іван" }),
          row("b", 2, { assignee: "Олена" }),
          item,
        ]}
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Обрати роботи"));

    const options = screen.getAllByLabelText(/№\d — Робота/);
    expect(options[0]).toHaveAccessibleName("№2 — Робота b");
    expect(options[1]).toHaveAccessibleName("№1 — Робота a");
  });

  it("closes the dependency picker with a confirmation button", async () => {
    const user = userEvent.setup();
    const item = row("c", 3, { startMode: "dependencies" });
    render(
      <DependencyEditor
        item={item}
        items={[row("a", 1), item]}
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Обрати роботи"));
    expect(screen.getByRole("group", { name: "Список залежностей" })).toHaveAttribute("open");

    await user.click(screen.getByRole("button", { name: "Готово" }));

    expect(screen.getByRole("group", { name: "Список залежностей" })).not.toHaveAttribute("open");
  });

  it("renders the current number for a stable selected id", () => {
    const selected = row("a", 1);
    const item = row("b", 2, {
      startMode: "dependencies",
      predecessorIds: ["a"],
    });
    const { rerender } = render(
      <DependencyEditor item={item} items={[selected, item]} onChange={vi.fn()} />,
    );
    expect(screen.getByText("№1")).toBeVisible();

    rerender(
      <DependencyEditor
        item={{ ...item, position: 1 }}
        items={[{ ...item, position: 1 }, { ...selected, position: 2 }]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("№2")).toBeVisible();
  });

  it("shows the affected-row error", () => {
    render(
      <DependencyEditor
        item={row("a", 1)}
        items={[row("a", 1)]}
        error="Виявлено цикл залежностей"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Виявлено цикл залежностей");
  });
});
