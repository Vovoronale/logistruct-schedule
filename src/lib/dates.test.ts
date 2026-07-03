import { describe, expect, it } from "vitest";
import { addWorkingDays, buildTimelineDays, isWeekend } from "./dates";

describe("addWorkingDays", () => {
  it("skips Saturday and Sunday using the workbook semantics", () => {
    expect(addWorkingDays("2026-07-03", 2)).toBe("2026-07-07");
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

  it("adds two calendar days of padding around scheduled work", () => {
    const days = buildTimelineDays([
      { startDate: "2026-07-03", durationDays: 2 },
    ]);

    expect(days[0]).toBe("2026-07-01");
    expect(days.at(-1)).toBe("2026-07-09");
  });

  it("returns an empty range when no row is scheduled", () => {
    expect(buildTimelineDays([{ startDate: null, durationDays: null }])).toEqual([]);
  });
});
