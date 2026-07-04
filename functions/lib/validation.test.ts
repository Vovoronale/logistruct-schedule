import { describe, expect, it } from "vitest";
import type { Assignee, ScheduleItem } from "../../src/types";
import { ValidationError, validateScheduleDraft } from "./validation";

const validItem: ScheduleItem = {
  id: "drawing-001",
  position: 4,
  section: " КЗ-0 ",
  sheetNumber: 1,
  title: " Заголовний лист ",
  startMode: "manual",
  startDate: "2026-07-03",
  durationDays: 3,
  predecessorIds: [],
  assignee: " Ми ",
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
};

const person = (name: string, id = "person-1", color = "#00B050"): Assignee => ({
  id,
  name,
  color,
  position: 1,
  createdAt: validItem.createdAt,
  updatedAt: validItem.updatedAt,
});

describe("validateScheduleDraft", () => {
  it("normalizes positions and trims text", () => {
    const draft = validateScheduleDraft({ revision: 2, items: [validItem], assignees: [] });
    expect(draft.items[0]).toMatchObject({
      position: 1,
      section: "КЗ-0",
      title: "Заголовний лист",
      assignee: "Ми",
    });
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      validateScheduleDraft({ revision: 2, items: [validItem, validItem], assignees: [] }),
    ).toThrow(ValidationError);
  });

  it("rejects invalid dates and non-positive durations", () => {
    expect(() =>
      validateScheduleDraft({
        revision: 2,
        items: [{ ...validItem, startDate: "2026-02-31", durationDays: 0 }],
        assignees: [],
      }),
    ).toThrow(ValidationError);
  });

  it("normalizes assignee names and colors", () => {
    const result = validateScheduleDraft({
      revision: 2,
      items: [validItem],
      assignees: [{
        ...person("  ІВ  ", "person-1", "#00b050"),
        position: 9,
      }],
    });
    expect(result.assignees[0]).toMatchObject({
      name: "ІВ",
      color: "#00B050",
      position: 1,
    });
  });

  it("rejects duplicate assignee names ignoring case", () => {
    expect(() => validateScheduleDraft({
      revision: 2,
      items: [],
      assignees: [person("ІВ"), person("ів", "person-2")],
    })).toThrow("Назви виконавців не можуть повторюватися");
  });

  it("rejects invalid assignee colors", () => {
    expect(() => validateScheduleDraft({
      revision: 2,
      items: [],
      assignees: [person("ІВ", "person-1", "green")],
    })).toThrow("Колір має бути у форматі #RRGGBB");
  });
});
