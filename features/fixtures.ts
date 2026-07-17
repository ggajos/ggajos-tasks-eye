export const DEFAULT_FIXTURE_TODAY = "2026-07-08";

export type FixtureMode = "open" | "inbox" | "hold";

export interface FixtureFile {
  path: string;
  markdown: string;
}

export interface FeatureFixture {
  files: readonly FixtureFile[];
  today: string;
  settings: {
    mode: FixtureMode;
    contextFilter: string;
    notesFolderPath: string;
    availability: AvailabilitySettings;
    holidayCache: HolidayCache;
  };
}

export interface ViolationFixture extends FeatureFixture {
  subject: FixtureFile;
}

export interface TaskFixture {
  text: string;
  checked?: boolean;
  due?: string;
  completed?: string;
}

export interface NoteFixture {
  status?: string | null;
  body?: string;
  tasks?: readonly (string | TaskFixture)[];
}

export interface FixtureOptions {
  today?: string;
  settings?: Partial<FeatureFixture["settings"]>;
}

function defaultAvailability(): AvailabilitySettings {
  return {
    countryCode: "",
    nonWorkingWeekdays: [0, 6],
    personalTimeOff: [
      {
        id: "fixture-single-day",
        from: "2026-07-13",
        to: null,
        label: "",
      },
      {
        id: "fixture-vacation-range",
        from: "2026-07-18",
        to: "2026-07-27",
        label: "",
      },
    ],
  };
}

function emptyHolidayCache(): HolidayCache {
  return {
    countryCode: "",
    years: {},
    countries: [],
    countriesFetchedAt: null,
  };
}

function assertFixturePath(filePath: string): void {
  if (
    filePath.startsWith("/") ||
    filePath.includes("\\") ||
    filePath.split("/").includes("..") ||
    !filePath.endsWith(".md")
  ) {
    throw new Error(`Invalid fixture Markdown path: "${filePath}"`);
  }
}

export function task(spec: string | TaskFixture): string {
  const value = typeof spec === "string" ? { text: spec } : spec;
  const checked = value.checked ?? value.completed !== undefined;
  const due = value.due ? ` 📅 ${value.due}` : "";
  const completed = value.completed ? ` ✅ ${value.completed}` : "";
  return `- [${checked ? "x" : " "}] ${value.text}${due}${completed}`;
}

export function note(
  filePath: string,
  source: string | NoteFixture,
): FixtureFile {
  assertFixturePath(filePath);
  if (typeof source === "string") {
    return { path: filePath, markdown: source };
  }

  const sections: string[] = [];
  if (source.status !== undefined) {
    const status = source.status === null ? "" : ` ${source.status}`;
    sections.push(`---\nstatus:${status}\n---`);
  }
  if (source.body?.trim()) sections.push(source.body.trim());
  if (source.tasks?.length) sections.push(source.tasks.map(task).join("\n"));

  return { path: filePath, markdown: `${sections.join("\n\n")}\n` };
}

export function fixture(
  files: readonly FixtureFile[],
  options: FixtureOptions = {},
): FeatureFixture {
  const paths = new Set<string>();
  for (const file of files) {
    assertFixturePath(file.path);
    if (paths.has(file.path)) {
      throw new Error(`Duplicate fixture path: "${file.path}"`);
    }
    paths.add(file.path);
  }

  return {
    files: [...files],
    today: options.today ?? DEFAULT_FIXTURE_TODAY,
    settings: {
      mode: options.settings?.mode ?? "open",
      contextFilter: options.settings?.contextFilter ?? "*",
      notesFolderPath: options.settings?.notesFolderPath ?? "/",
      availability: options.settings?.availability ?? defaultAvailability(),
      holidayCache: options.settings?.holidayCache ?? emptyHolidayCache(),
    },
  };
}

export function violationFixture(
  subject: FixtureFile,
  supportingFiles: readonly FixtureFile[] = [],
  options: FixtureOptions = {},
): ViolationFixture {
  return {
    ...fixture([subject, ...supportingFiles], options),
    subject,
  };
}

export function isFeatureFixture(value: unknown): value is FeatureFixture {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<FeatureFixture>;
  return (
    Array.isArray(candidate.files) &&
    candidate.files.every(
      (file) =>
        typeof file === "object" &&
        file !== null &&
        typeof (file as Partial<FixtureFile>).path === "string" &&
        typeof (file as Partial<FixtureFile>).markdown === "string",
    ) &&
    typeof candidate.today === "string" &&
    typeof candidate.settings?.mode === "string" &&
    typeof candidate.settings?.contextFilter === "string" &&
    typeof candidate.settings?.notesFolderPath === "string" &&
    typeof candidate.settings?.availability === "object" &&
    candidate.settings.availability !== null &&
    typeof candidate.settings?.holidayCache === "object" &&
    candidate.settings.holidayCache !== null
  );
}

import type { AvailabilitySettings, HolidayCache } from "../src/vacation";
