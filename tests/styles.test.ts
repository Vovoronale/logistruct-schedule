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

  it("keeps pre-timeline schedule columns narrow", () => {
    const css = readFileSync("src/styles.css", "utf8");

    expect(css).toContain("--c5: 96px;");
    expect(css).toContain("--c6: 92px;");
    expect(css).toContain("--c7: 76px;");
    expect(css).toContain("--c8: 96px;");
    expect(css).toContain("--c9: 88px;");
    expect(css).toContain("--c10: 104px;");
    expect(css).toContain("--c11: 92px;");
    expect(css).toMatch(/th:nth-child\(5\), \.schedule-table tbody td:nth-child\(5\) \{ width: var\(--c5\); min-width: var\(--c5\);/);
    expect(css).toMatch(/th:nth-child\(11\), \.schedule-table tbody td:nth-child\(11\) \{ width: var\(--c11\); min-width: var\(--c11\);/);
    expect(css).toMatch(/td:nth-child\(n\+5\):nth-child\(-n\+11\) \{ padding-inline: 6px; \}/);
    expect(css).toMatch(/\.cell-input\.date \{ min-width: 0; padding-inline: 4px; \}/);
  });
});
