import { describe, expect, it } from "vitest";
import {
  addWorkingDays,
  buildTimelineDays,
  isNonWorkingDay,
  isWeekend,
  workingDaysAfter,
} from "./dates";

describe("addWorkingDays", () => {
  it("skips Saturday and Sunday using the workbook semantics", () => {
    expect(addWorkingDays("2026-07-03", 2)).toBe("2026-07-07");
  });

  it("skips configured holidays", () => {
    expect(addWorkingDays("2026-07-03", 2, new Set(["2026-07-06"])))
      .toBe("2026-07-08");
  });

  it("returns null for incomplete or invalid values", () => {
    expect(addWorkingDays(null, null)).toBeNull();
    expect(addWorkingDays("not-a-date", 3)).toBeNull();
    expect(addWorkingDays("2026-07-03", 0)).toBeNull();
  });
});

describe("timeline helpers", () => {
  it("recognizes weekends without local-time drift", () => {
    expect(isWeekend("2026-07-04")).toBe(true);
    expect(isWeekend("2026-07-06")).toBe(false);
  });

  it("recognizes configured non-working days", () => {
    expect(isNonWorkingDay("2026-07-06", new Set(["2026-07-06"]))).toBe(true);
  });

  it("adds two calendar days of padding around scheduled work", () => {
    const days = buildTimelineDays([
      { startDate: "2026-07-03", durationDays: 2 },
    ]);

    expect(days[0]).toBe("2026-07-01");
    expect(days.at(-1)).toBe("2026-07-09");
  });

  it("includes today even when scheduled work is later", () => {
    const days = buildTimelineDays(
      [{ startDate: "2026-08-03", durationDays: 2 }],
      "2026-07-03",
    );

    expect(days).toContain("2026-07-03");
    expect(days).toContain("2026-08-05");
  });

  it("shows a useful today range when no row is scheduled", () => {
    expect(buildTimelineDays([], "2026-07-03")).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
      "2026-07-05",
    ]);
  });
});

describe("workingDaysAfter", () => {
  it("starts at zero and excludes weekends", () => {
    expect(workingDaysAfter("2026-07-03", "2026-07-03")).toBe(0);
    expect(workingDaysAfter("2026-07-03", "2026-07-06")).toBe(1);
    expect(workingDaysAfter("2026-07-03", "2026-07-07")).toBe(2);
  });

  it("excludes configured holidays", () => {
    expect(workingDaysAfter(
      "2026-07-03",
      "2026-07-07",
      new Set(["2026-07-06"]),
    )).toBe(1);
  });

  it("returns null for invalid dates and zero before the start", () => {
    expect(workingDaysAfter("bad-date", "2026-07-07")).toBeNull();
    expect(workingDaysAfter("2026-07-07", "2026-07-03")).toBe(0);
  });
});
