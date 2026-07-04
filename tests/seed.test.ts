import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("initial D1 seed", () => {
  const sql = readFileSync("migrations/0001_initial.sql", "utf8");

  it("contains exactly 68 schedule inserts", () => {
    expect((sql.match(/INSERT INTO schedule_items/g) ?? []).length).toBe(68);
  });

  it("preserves the first and last drawing records", () => {
    expect(sql).toContain(
      "Заголовний лист. Основні вказівки. Перелік креслень.",
    );
    expect(sql).toContain(
      "План несучих елементів покрівлі над першим поверхом. Вузли. Специфікація.",
    );
  });

  it("starts schedule metadata at revision one", () => {
    expect(sql).toContain("INSERT INTO schedule_meta");
    expect(sql).toMatch(/VALUES \(1, 1,/);
  });

  it("creates and seeds the assignee directory", () => {
    const assigneeSql = readFileSync("migrations/0002_assignees.sql", "utf8");
    expect(assigneeSql).toContain("CREATE TABLE assignees");
    expect((assigneeSql.match(/INSERT INTO assignees/g) ?? []).length).toBe(17);
    expect(assigneeSql).toContain("#00B050");
  });

  it("adds stable dependencies and history storage", () => {
    const dependencySql = readFileSync(
      "migrations/0003_dependencies_history.sql",
      "utf8",
    );
    expect(dependencySql).toContain("ADD COLUMN start_mode");
    expect(dependencySql).toContain("CREATE TABLE item_dependencies");
    expect(dependencySql).toContain("CREATE TABLE schedule_history");
    expect(dependencySql).toContain("ON DELETE RESTRICT");
  });
});
