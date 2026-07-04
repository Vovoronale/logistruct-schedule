import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ScheduleModes } from "./ScheduleModes";

it("explains and clears dependency analysis", async () => {
  const user = userEvent.setup();
  const onClearAnalysis = vi.fn();
  render(
    <ScheduleModes
      analysisActive
      onClearAnalysis={onClearAnalysis}
    />,
  );

  expect(screen.getByText("Попередники")).toBeVisible();
  expect(screen.getByText("Вибрана робота")).toBeVisible();
  expect(screen.getByText("Наступники")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Очистити підсвічування" }));
  expect(onClearAnalysis).toHaveBeenCalledOnce();
});

it("loads, selects and closes a schedule comparison", async () => {
  const user = userEvent.setup();
  const onOpenComparison = vi.fn();
  const onSelectRevision = vi.fn();
  const onClearComparison = vi.fn();
  render(
    <ScheduleModes
      analysisActive={false}
      onClearAnalysis={vi.fn()}
      editing={false}
      history={[{ revision: 4, savedAt: "2026-07-03T10:00:00Z" }]}
      historyLoading={false}
      comparison={{
        addedIds: ["added"],
        removedItems: [],
        changed: [{ id: "changed", fields: ["title"] }],
        rescheduledIds: ["moved"],
      }}
      selectedRevision={4}
      onOpenComparison={onOpenComparison}
      onSelectRevision={onSelectRevision}
      onClearComparison={onClearComparison}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Порівняти" }));
  expect(onOpenComparison).toHaveBeenCalledOnce();
  await user.selectOptions(screen.getByLabelText("Версія для порівняння"), "4");
  expect(onSelectRevision).toHaveBeenCalledWith(4);
  expect(screen.getByText("Додано: 1")).toBeVisible();
  expect(screen.getByText("Перенесено: 1")).toBeVisible();
  expect(screen.getByText("Змінено: 1")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Закрити порівняння" }));
  expect(onClearComparison).toHaveBeenCalledOnce();
});

it("disables comparison while editing", () => {
  render(
    <ScheduleModes
      analysisActive={false}
      onClearAnalysis={vi.fn()}
      editing
      history={[]}
      historyLoading={false}
      onOpenComparison={vi.fn()}
      onSelectRevision={vi.fn()}
      onClearComparison={vi.fn()}
    />,
  );

  expect(screen.getByRole("button", { name: "Порівняти" })).toBeDisabled();
});
