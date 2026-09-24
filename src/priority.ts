export const NORMAL_PRIORITY = 3;
export const HIGHEST_PRIORITY = 0;
export const LOWEST_PRIORITY = 5;

export type PriorityDirection = "raise" | "lower";

const PRIORITY_RE = /(?:🔺|⏫|🔼|🔽|⏬)\uFE0F?/;
const ALL_PRIORITY_RE = /(?:🔺|⏫|🔼|🔽|⏬)\uFE0F?/g;
const DATE_FIELD_RE = /(?:📅|📆|🗓)\uFE0F?\s*\d{4}-\d{2}-\d{2}/;
const BLOCK_LINK_RE = / \^[a-zA-Z0-9-]+$/;

const PRIORITY_RANKS: Record<string, number> = {
  "🔺": 0,
  "⏫": 1,
  "🔼": 2,
  "🔽": 4,
  "⏬": 5,
};

const RANK_SIGNIFIERS: Record<number, string> = Object.fromEntries(
  Object.entries(PRIORITY_RANKS).map(([signifier, rank]) => [rank, signifier]),
);

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

export function canRaisePriority(rank: number): boolean {
  return rank > HIGHEST_PRIORITY;
}

export function priorityRowClasses(priority: number): string[] {
  const classes = [`eye-priority-rank-${priority}`];
  if (priority > NORMAL_PRIORITY) classes.push("eye-priority-low");
  return classes;
}

export function canLowerPriority(rank: number): boolean {
  return rank < LOWEST_PRIORITY;
}

export function nextPriorityRank(
  rank: number,
  direction: PriorityDirection,
): number {
  const next = direction === "raise" ? rank - 1 : rank + 1;
  return Math.min(LOWEST_PRIORITY, Math.max(HIGHEST_PRIORITY, next));
}

export function setPriorityInText(
  lineText: string,
  targetRank: number,
): string {
  const signifier = RANK_SIGNIFIERS[targetRank];

  if (PRIORITY_RE.test(lineText)) {
    if (signifier) return lineText.replace(PRIORITY_RE, signifier);
    return lineText
      .replace(new RegExp(`${PRIORITY_RE.source}\\s?`), "")
      .replace(/[ \t]+$/, "");
  }

  if (!signifier) return lineText;

  const due = lineText.match(DATE_FIELD_RE);
  if (due) {
    return lineText.replace(DATE_FIELD_RE, `${signifier} ${due[0]}`);
  }

  const trimmed = lineText.replace(/\s+$/, "");
  const blockLink = trimmed.match(BLOCK_LINK_RE);
  if (blockLink) {
    return `${trimmed.slice(0, blockLink.index)} ${signifier}${blockLink[0]}`;
  }

  return `${trimmed} ${signifier}`;
}
