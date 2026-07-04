import { describe, expect, it } from "vitest";
import type { ScheduleItem } from "../types";
import {
  calculateItemProgress,
  calculateScheduleProgress,
} from "./progress";

function makeItem(patch: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "item-1",
    position: 1,
    section: "КЗ-0",
    sheetNumber: 1,
    title: "Лист",
    startMode: "manual",
    startDate: "2026-07-03",
    durationDays: 5,
    predecessorIds: [],
    assignee: null,
    status: "planned",
    createdAt: "2026-07-03T00:00:00Z",
    updatedAt: "2026-07-03T00:00:00Z",
    ...patch,
  };
}

describe("calculateItemProgress", () => {
  it("is zero on the start day and grows only on later working days", () => {
    expect(calculateItemProgress(makeItem(), "2026-07-03")).toBe(0);
    expect(calculateItemProgress(makeItem(), "2026-07-04")).toBe(0);
    expect(calculateItemProgress(makeItem(), "2026-07-06")).toBe(20);
    expect(calculateItemProgress(makeItem(), "2026-07-07")).toBe(40);
  });

  it("stays at zero before the start", () => {
    expect(calculateItemProgress(makeItem(), "2026-07-02")).toBe(0);
  });

  it("caps unfinished sheets at 95 percent", () => {
    expect(calculateItemProgress(makeItem(), "2026-07-31")).toBe(95);
  });

  it("gives completed valid sheets 100 percent", () => {
    expect(
      calculateItemProgress(
        makeItem({ status: "completed" }),
        "2026-07-03",
      ),
    ).toBe(100);
  });

  it("excludes sheets without a valid start or duration", () => {
    expect(
      calculateItemProgress(makeItem({ startDate: null }), "2026-07-07"),
    ).toBeNull();
    expect(
      calculateItemProgress(makeItem({ durationDays: null }), "2026-07-07"),
    ).toBeNull();
    expect(
      calculateItemProgress(
        makeItem({ startDate: "not-a-date" }),
        "2026-07-07",
      ),
    ).toBeNull();
  });
});

describe("calculateScheduleProgress", () => {
  it("weights sheets by duration and builds sections dynamically", () => {
    const result = calculateScheduleProgress(
      [
        makeItem({
          id: "a",
          section: "КЗ-10",
          durationDays: 10,
          status: "completed",
        }),
        makeItem({
          id: "b",
          section: "КЗ-2",
          durationDays: 5,
          status: "planned",
        }),
        makeItem({
          id: "c",
          section: "Новий",
          durationDays: 5,
          startDate: null,
        }),
      ],
      "2026-07-03",
    );

    expect(result.overall?.percentage).toBeCloseTo(1000 / 15);
    expect(result.overall).toMatchObject({ sheetCount: 2, totalDays: 15 });
    expect(result.sections.map((section) => section.section)).toEqual([
      "КЗ-2",
      "КЗ-10",
    ]);
    expect(result.sections[1]).toMatchObject({
      percentage: 100,
      sheetCount: 1,
      totalDays: 10,
    });
  });

  it("returns no summary when every sheet is incomplete", () => {
    const result = calculateScheduleProgress(
      [makeItem({ startDate: null })],
      "2026-07-03",
    );

    expect(result).toEqual({ overall: null, sections: [] });
  });
});
