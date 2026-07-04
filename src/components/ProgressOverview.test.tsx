import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressOverview } from "./ProgressOverview";

describe("ProgressOverview", () => {
  it("renders overall and section metrics", () => {
    render(
      <ProgressOverview
        progress={{
          overall: { percentage: 47.5, sheetCount: 3, totalDays: 20 },
          sections: [
            {
              section: "КЗ-0",
              percentage: 25,
              sheetCount: 2,
              totalDays: 8,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("47,5%")).toBeVisible();
    expect(screen.getByText("КЗ-0")).toBeVisible();
    expect(screen.getByText("2 листи · 8 робочих днів")).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Загальний прогрес" }),
    ).toHaveAttribute("value", "47.5");
  });

  it("renders an explicit empty state", () => {
    render(
      <ProgressOverview progress={{ overall: null, sections: [] }} />,
    );

    expect(
      screen.getByText("Недостатньо даних для розрахунку"),
    ).toBeVisible();
  });
});
