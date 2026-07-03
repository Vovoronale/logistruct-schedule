export const ASSIGNEE_COLORS: Readonly<Record<string, string>> = {
  ІВ: "#00B050",
  Втк: "#FF9999",
  Єв: "#FF99FF",
  Ол: "#FFCC66",
  Ми: "#66FFFF",
  Ро: "#CCFF66",
  Ва: "#00B0F0",
  Іг: "#FFFF99",
  На: "#538DD5",
  Вта: "#BFBFBF",
  Тр: "#92D050",
  Вв: "#948A54",
  Ай: "#DA9694",
  Юл: "#FABF8F",
  Оо: "#B1A0C7",
  Тн: "#FFC000",
  Св: "#76933C",
};

const FALLBACK_COLORS = [
  "#4472C4",
  "#70AD47",
  "#ED7D31",
  "#A64D79",
  "#5B9BD5",
  "#8064A2",
] as const;

export function assigneeColor(assignee: string | null): string {
  if (!assignee) return "#A8B3C5";
  const known = ASSIGNEE_COLORS[assignee];
  if (known) return known;
  let hash = 0;
  for (const character of assignee) {
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  }
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export function readableTextColor(background: string): "#ffffff" | "#17325c" {
  const normalized = background.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const yiq = (red * 299 + green * 587 + blue * 114) / 1000;
  return yiq >= 165 ? "#17325c" : "#ffffff";
}
