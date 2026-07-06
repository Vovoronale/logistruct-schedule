import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceToolbar } from "./WorkspaceToolbar";

const filters = { query: "", section: [], assignee: [], status: [] };
const renderToolbar = (props: Partial<Parameters<typeof WorkspaceToolbar>[0]> = {}) =>
  render(
    <WorkspaceToolbar
      filters={filters}
      sections={[]}
      assignees={[]}
      visibleCount={0}
      totalCount={0}
      activeView="schedule"
      openPanel={null}
      onChange={vi.fn()}
      onViewChange={vi.fn()}
      onTogglePanel={vi.fn()}
      onCompare={vi.fn()}
      {...props}
    />,
  );

describe("WorkspaceToolbar", () => {
  it("renders compact schedule controls and reports filter changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderToolbar({
      sections: ["КЗ-0"],
      assignees: ["Іван"],
      visibleCount: 12,
      totalCount: 68,
      onChange,
    });

    expect(screen.getByText("12 із 68 креслень")).toBeVisible();
    expect(screen.getByRole("button", { name: "Прогрес" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Виконавці" })).toHaveAttribute("aria-controls", "assignees-panel");

    await user.type(screen.getByRole("textbox", { name: "Пошук по всіх колонках" }), "п");
    expect(onChange).toHaveBeenLastCalledWith({ ...filters, query: "п" });
  });

  it("lets users select multiple values for exact filters", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = renderToolbar({
      sections: ["КЗ-0", "КМ2"],
      assignees: ["Іван", "Олена"],
      visibleCount: 12,
      totalCount: 68,
      onChange,
    });

    await user.click(screen.getByText("Усі розділи"));
    await user.click(screen.getByRole("checkbox", { name: "КЗ-0" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...filters, section: ["КЗ-0"] });

    rerender(
      <WorkspaceToolbar
        filters={{ ...filters, assignee: ["Іван"] }}
        sections={["КЗ-0", "КМ2"]}
        assignees={["Іван", "Олена"]}
        visibleCount={12}
        totalCount={68}
        activeView="schedule"
        openPanel={null}
        onChange={onChange}
        onViewChange={vi.fn()}
        onTogglePanel={vi.fn()}
        onCompare={vi.fn()}
      />,
    );
    await user.click(screen.getByLabelText("Виконавець"));
    await user.click(screen.getByRole("checkbox", { name: "Олена" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...filters, assignee: ["Іван", "Олена"] });

    await user.click(screen.getByText("Усі статуси"));
    await user.click(screen.getByRole("checkbox", { name: "Заплановано" }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...filters,
      assignee: ["Іван"],
      status: ["planned"],
    });
  });

  it("opens one information panel and starts comparison through callbacks", async () => {
    const user = userEvent.setup();
    const onTogglePanel = vi.fn();
    const onCompare = vi.fn();

    renderToolbar({
      openPanel: "progress",
      onTogglePanel,
      onCompare,
    });

    expect(screen.getByRole("button", { name: "Прогрес" })).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Виконавці" }));
    expect(onTogglePanel).toHaveBeenCalledWith("assignees");
    await user.click(screen.getByRole("button", { name: "Порівняти" }));
    expect(onCompare).toHaveBeenCalledOnce();
  });

  it("switches between the schedule and workload pages", async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();

    renderToolbar({ onViewChange });

    await user.click(screen.getByRole("button", { name: "Завантаженість" }));

    expect(onViewChange).toHaveBeenCalledWith("workload");
  });

  it("closes open filter menus before switching pages", async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    const { container } = renderToolbar({
      assignees: ["Іван"],
      onViewChange,
    });

    await user.click(screen.getByText("Усі виконавці"));
    expect(container.querySelector('details[open]')).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Завантаженість" }));

    expect(container.querySelector('details[open]')).not.toBeInTheDocument();
    expect(onViewChange).toHaveBeenCalledWith("workload");
  });
});
