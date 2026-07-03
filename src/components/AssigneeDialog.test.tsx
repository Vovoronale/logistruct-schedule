import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Assignee, ScheduleItem } from "../types";
import { AssigneeDialog } from "./AssigneeDialog";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  HTMLDialogElement.prototype.close = function close() { this.open = false; };
});

const person = (name: string): Assignee => ({
  id: "person-1",
  name,
  color: "#00B050",
  position: 1,
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
});

const itemsWith = (name: string): ScheduleItem[] => [{
  id: "drawing-001",
  position: 1,
  section: "КЗ-0",
  sheetNumber: 1,
  title: "Заголовний лист",
  startDate: null,
  durationDays: null,
  assignee: name,
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
}];

describe("AssigneeDialog", () => {
  it("adds and applies an assignee with a chosen color", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <AssigneeDialog
        open
        assignees={[]}
        items={[]}
        onClose={() => undefined}
        onApply={onApply}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Додати виконавця" }));
    await user.type(screen.getByLabelText("Ім’я виконавця 1"), "Ан");
    fireEvent.change(screen.getByLabelText("Колір виконавця 1"), {
      target: { value: "#123456" },
    });
    await user.click(screen.getByRole("button", { name: "Застосувати" }));
    expect(onApply).toHaveBeenCalledWith([
      expect.objectContaining({ name: "Ан", color: "#123456" }),
    ]);
  });

  it("disables deletion for a used assignee", () => {
    render(
      <AssigneeDialog
        open
        assignees={[person("ІВ")]}
        items={itemsWith("ІВ")}
        onClose={() => undefined}
        onApply={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "Видалити ІВ" })).toBeDisabled();
    expect(screen.getByText("Використано у 1 кресленні")).toBeInTheDocument();
  });
});
