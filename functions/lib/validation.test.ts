import { describe, expect, it } from "vitest";
import type { ScheduleItem } from "../../src/types";
import { ValidationError, validateScheduleDraft } from "./validation";

const validItem: ScheduleItem = {
  id: "drawing-001",
  position: 4,
  section: " КЗ-0 ",
  sheetNumber: 1,
  title: " Заголовний лист ",
  startDate: "2026-07-03",
  durationDays: 3,
  assignee: " Ми ",
  status: "planned",
  createdAt: "2026-07-03T00:00:00Z",
  updatedAt: "2026-07-03T00:00:00Z",
};

describe("validateScheduleDraft", () => {
  it("normalizes positions and trims text", () => {
    const draft = validateScheduleDraft({ revision: 2, items: [validItem] });
    expect(draft.items[0]).toMatchObject({
      position: 1,
      section: "КЗ-0",
      title: "Заголовний лист",
      assignee: "Ми",
    });
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      validateScheduleDraft({ revision: 2, items: [validItem, validItem] }),
    ).toThrow(ValidationError);
  });

  it("rejects invalid dates and non-positive durations", () => {
    expect(() =>
      validateScheduleDraft({
        revision: 2,
        items: [{ ...validItem, startDate: "2026-02-31", durationDays: 0 }],
      }),
    ).toThrow(ValidationError);
  });
});
