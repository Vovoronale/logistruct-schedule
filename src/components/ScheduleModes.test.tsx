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
