import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditActions } from "./EditActions";

const baseProps = {
  dirty: true,
  canSave: true,
  canUndo: true,
  saving: false,
  onAdd: vi.fn(),
  onManageAssignees: vi.fn(),
  onUndo: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

describe("EditActions", () => {
  it("renders an undo button that calls back when operations can be reverted", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    render(<EditActions {...baseProps} onUndo={onUndo} />);

    await user.click(screen.getByRole("button", { name: "Відмінити операцію" }));

    expect(onUndo).toHaveBeenCalledOnce();
  });

  it("disables undo when there is no operation history", () => {
    render(<EditActions {...baseProps} canUndo={false} />);

    expect(screen.getByRole("button", { name: "Відмінити операцію" })).toBeDisabled();
  });
});
