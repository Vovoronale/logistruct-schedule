import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Root from "./Root";

vi.mock("./App", () => ({ default: () => <main>Основний графік</main> }));
vi.mock("./components/ProjectStatusRoute", () => ({
  ProjectStatusRoute: () => <main>Публічний стан проєкту</main>,
}));

afterEach(() => window.history.replaceState({}, "", "/"));

describe("Root", () => {
  it("opens the status page only on the exact private-link path", () => {
    window.history.replaceState({}, "", "/sproshchenodlamaksuma");
    render(<Root />);

    expect(screen.getByText("Публічний стан проєкту")).toBeVisible();
    expect(screen.queryByText("Основний графік")).not.toBeInTheDocument();
  });

  it("keeps every other path on the main application", () => {
    window.history.replaceState({}, "", "/sproshchenodlamaksuma-extra");
    render(<Root />);

    expect(screen.getByText("Основний графік")).toBeVisible();
    expect(screen.queryByText("Публічний стан проєкту")).not.toBeInTheDocument();
  });
});
