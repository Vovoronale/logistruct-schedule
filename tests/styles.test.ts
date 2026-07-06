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

  it("styles schedule metadata pin controls without forcing columns pinned by default", () => {
    const css = readFileSync("src/styles.css", "utf8");

    expect(css).toMatch(/\.schedule-table \.sticky-col\.col-progress \{ box-shadow: 5px 0 8px -8px rgba\(22,48,86,\.65\); \}/);
    expect(css).toMatch(/\.pinnable-header \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/s);
    expect(css).toMatch(/\.pinnable-header input \{[^}]*accent-color: var\(--blue\);/s);
    expect(css).not.toMatch(/\.schedule-table \.col-start-date \{ left:/);
    expect(css).not.toMatch(/\.schedule-table \.col-progress \{ left:/);
  });

  it("mutes incomplete rows with a stronger treatment for empty rows", () => {
    const css = readFileSync("src/styles.css", "utf8");

    expect(css).toMatch(/\.schedule-table tbody tr\.row-partial \{ opacity: \.68; \}/);
    expect(css).toMatch(/\.schedule-table tbody tr\.row-empty \{ opacity: \.42; \}/);
  });
});
