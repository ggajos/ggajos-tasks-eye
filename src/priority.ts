export const NORMAL_PRIORITY = 3;

const PRIORITY_RE = /(?:🔺|⏫|🔼|🔽|⏬)\uFE0F?/;
const ALL_PRIORITY_RE = /(?:🔺|⏫|🔼|🔽|⏬)\uFE0F?/g;

const PRIORITY_RANKS: Record<string, number> = {
  "🔺": 0,
  "⏫": 1,
  "🔼": 2,
  "🔽": 4,
  "⏬": 5,
};

export function parsePriority(text: string): number {
  const signifier = text.match(PRIORITY_RE)?.[0];
  if (!signifier) return NORMAL_PRIORITY;

  return PRIORITY_RANKS[signifier.replace(/\uFE0F$/, "")] ?? NORMAL_PRIORITY;
}

export function stripPrioritySignifier(text: string): string {
  return text
    .replace(ALL_PRIORITY_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
