import { describe, expect, it } from "vitest";
import type { Assignee } from "../types";
import { assigneeColor, readableTextColor } from "./colors";

const configured: Assignee[] = [{
  id: "person-1",
  name: "ІВ",
  color: "#123456",
  position: 1,
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
}];

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

  it("uses the configured directory color before the fallback", () => {
    expect(assigneeColor("ІВ", configured)).toBe("#123456");
  });
});
