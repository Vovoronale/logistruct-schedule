const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}

export function normalizeHolidays(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter(isValidIsoDate));
}

export async function loadHolidays(fetcher: typeof fetch = fetch): Promise<Set<string>> {
  try {
    const response = await fetcher("/holidays.json");
    if (!response.ok) return new Set();
    return normalizeHolidays(await response.json());
  } catch {
    return new Set();
  }
}
