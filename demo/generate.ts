import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { DEMO_NOTES, type DemoNote, type DemoTask } from "./content";
import {
  type DueBucket,
  formatYmd,
  nextSaturday,
  recentWorkingDay,
  resolveDueDate,
} from "./dates";

const PRIORITY_SIGNIFIERS: Record<string, string> = {
  highest: "🔺",
  high: "⏫",
  medium: "🔼",
  low: "🔽",
  lowest: "⏬",
};

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const DESTINATION = path.resolve(REPO_ROOT, "..", "org-demo");

/**
 * The generator must only ever create notes. Anything that could escape the
 * destination, or reach into Obsidian's own configuration, is refused.
 */
function assertSafeNotePath(notePath: string): void {
  const segments = notePath.split("/");
  const unsafe =
    path.isAbsolute(notePath) ||
    notePath.includes("\\") ||
    segments.includes("..") ||
    segments.some((segment) => segment.startsWith(".")) ||
    !notePath.endsWith(".md");
  if (unsafe) {
    throw new Error(`Refusing to write unsafe demo note path: "${notePath}"`);
  }
}

function resolveTaskDate(
  task: DemoTask,
  today: Date,
  occurrences: Map<string, number>,
  usedInNote: Set<string>,
): string | null {
  if (!task.due || task.due === "none") return null;
  if (task.due === "saturday") return formatYmd(nextSaturday(today));

  const key = task.due;
  // Nudge the occurrence forward until the note stops repeating a date, so
  // sequential steps in one note never look like they are due the same day.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const occurrence = (occurrences.get(key) ?? 0) + attempt;
    const resolved = formatYmd(
      resolveDueDate(task.due as DueBucket | "overdue", today, occurrence),
    );
    if (!usedInNote.has(resolved) || attempt === 11) {
      occurrences.set(key, occurrence + 1);
      usedInNote.add(resolved);
      return resolved;
    }
  }
  return null;
}

function renderTask(
  task: DemoTask,
  today: Date,
  occurrences: Map<string, number>,
  usedInNote: Set<string>,
): string {
  const parts: string[] = [];
  const checked = task.completedDaysAgo !== undefined;
  parts.push(`- [${checked ? "x" : " "}] ${task.text}`);

  const signifier = task.priority
    ? PRIORITY_SIGNIFIERS[task.priority]
    : undefined;
  if (signifier) parts.push(signifier);

  const due = resolveTaskDate(task, today, occurrences, usedInNote);
  if (due) parts.push(`📅 ${due}`);

  if (task.completedDaysAgo !== undefined) {
    parts.push(
      `✅ ${formatYmd(recentWorkingDay(today, task.completedDaysAgo))}`,
    );
  }

  return parts.join(" ");
}

function renderNote(
  note: DemoNote,
  today: Date,
  occurrences: Map<string, number>,
): string {
  const frontmatter: string[] = [];
  if (note.status !== undefined) frontmatter.push(`status: ${note.status}`);
  if (note.up !== undefined) frontmatter.push(`up: "${note.up}"`);

  const sections: string[] = [`---\n${frontmatter.join("\n")}\n---`];
  sections.push(note.body.trim());

  if (note.tasks?.length) {
    const usedInNote = new Set<string>();
    const lines = note.tasks.map((task) =>
      renderTask(task, today, occurrences, usedInNote),
    );
    sections.push(lines.join("\n"));
  }

  return `${sections.join("\n\n")}\n`;
}

async function main(): Promise<void> {
  const today = new Date();
  const occurrences = new Map<string, number>();

  const rendered = DEMO_NOTES.map((note) => {
    assertSafeNotePath(note.path);
    return { path: note.path, markdown: renderNote(note, today, occurrences) };
  });

  const seen = new Set<string>();
  for (const note of rendered) {
    if (seen.has(note.path)) {
      throw new Error(`Duplicate demo note path: "${note.path}"`);
    }
    seen.add(note.path);
  }

  await mkdir(DESTINATION, { recursive: true });
  for (const note of rendered) {
    const target = path.join(DESTINATION, note.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, note.markdown, "utf8");
  }

  console.log(
    `Tasks Eye demo vault: wrote ${rendered.length} notes to ${DESTINATION}`,
  );
  console.log(`Anchored on ${formatYmd(today)}. Nothing was deleted.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
