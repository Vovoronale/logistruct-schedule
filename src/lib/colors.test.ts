import { describe, expect, it } from "vitest";
import { assigneeColor, readableTextColor } from "./colors";

describe("Excel color mapping", () => {
  it("uses exact workbook colors for known assignees", () => {
    expect(assigneeColor("ІВ")).toBe("#00B050");
    expect(assigneeColor("Тн")).toBe("#FFC000");
  });

  it("returns stable colors and readable foregrounds", () => {
    expect(assigneeColor("Новий")).toBe(assigneeColor("Новий"));
    expect(readableTextColor("#00B050")).toBe("#ffffff");
    expect(readableTextColor("#FFFF99")).toBe("#17325c");
  });
});
