import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("schedule row styles", () => {
  it("keeps schedule rows compact and vertically aligned", () => {
    const css = readFileSync("src/styles.css", "utf8");

    expect(css).toContain("--row-height: 44px;");
    expect(css).toMatch(/\.schedule-table th, \.schedule-table td \{[^}]*padding: 3px 9px;/s);
    expect(css).toMatch(/\.gantt-bar \{[^}]*top: 9px;[^}]*height: 27px;/s);
    expect(css).toMatch(/\.historical-bar \{[^}]*top: 4px;[^}]*height: 37px;/s);
    expect(css).toMatch(/\.drag-handle \{[^}]*top: 12px;/s);
  });
});
