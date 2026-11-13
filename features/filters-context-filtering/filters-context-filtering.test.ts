import { describe, expect, it } from "vitest";
import { buildBoard } from "../../src/board";
import {
  discoverContexts,
  formatContextLabel,
  getGlobalContext,
  matchesContextFilter,
  normalizeContextFilter,
} from "../../src/context";
import { createSnapshot } from "../../src/snapshot";
import { files } from "../testSupport";
import { filterNoticeFixture } from "./fixtures";

describe("Context filtering feature", () => {
  it("discovers contexts from first-level up links", () => {
    const indexedFiles = files([
      {
        path: "Root.md",
        markdown: "---\nup: -\n---\n",
      },
      {
        path: "anywhere/Architecture.md",
        markdown: "---\nup: [[Root]]\n---\n",
      },
      {
        path: "notes/Technology Radar.md",
        markdown: "---\nup: [[Architecture]]\n---\n",
      },
      {
        path: "Leadership.md",
        markdown: "---\nup: [[Root]]\n---\n",
      },
    ]);

    const contexts = discoverContexts(indexedFiles);

    expect(contexts).toEqual(["Architecture", "Leadership"]);
    expect(contexts.map(formatContextLabel)).toEqual([
      "Architecture",
      "Leadership",
    ]);
    expect(getGlobalContext(indexedFiles)).toBe("Root");
  });

  it("matches rows by the same context value shown in the filter", () => {
    const indexedFiles = files([
      {
        path: "Root.md",
        markdown: "---\nup: -\n---\n",
      },
      {
        path: "Architecture.md",
        markdown: "---\nup: [[Root]]\n---\n",
      },
      {
        path: "notes/Billing.md",
        markdown: "---\nup: [[Architecture]]\n---\n",
      },
      {
        path: "Leadership/Mentorship.md",
        markdown: "---\nup: [[Root]]\n---\n",
      },
    ]);
    const billing = indexedFiles.find((file) => file.basename === "Billing")!;
    const mentoring = indexedFiles.find(
      (file) => file.basename === "Mentorship",
    )!;

    expect(matchesContextFilter(billing, "Architecture", indexedFiles)).toBe(
      true,
    );
    expect(matchesContextFilter(mentoring, "Architecture", indexedFiles)).toBe(
      false,
    );
    expect(matchesContextFilter(mentoring, "Root", indexedFiles)).toBe(true);
    expect(normalizeContextFilter("missing", ["Architecture"], "Root")).toBe(
      "Root",
    );
  });
});

describe("Notes hidden by the context filter", () => {
  const indexed = files(filterNoticeFixture.files);
  const snapshot = createSnapshot(indexed);
  const now = new Date(2026, 6, 8);

  it.each([
    ["focus", 1],
    ["open", 4],
    ["inbox", 2],
    ["done", 1],
  ] as const)("counts hidden notes only in %s", (mode, expected) => {
    const screen = buildBoard(snapshot, {
      mode,
      contextFilter: "Work",
      now,
    });
    expect(screen.hiddenNoteCount).toBe(expected);
    expect(screen.isEmpty).toBe(mode === "inbox");
  });

  it.each(["focus", "open", "inbox", "done"] as const)(
    "reports hidden results when %s is empty in the selected context",
    (mode) => {
      const screen = buildBoard(snapshot, {
        mode,
        contextFilter: "Quiet",
        now,
      });
      expect(screen.isEmpty).toBe(true);
      expect(screen.hiddenNoteCount).toBeGreaterThan(0);
    },
  );

  it.each(["*", "Root", "missing"])(
    "does not report hidden notes for global or stale filter %s",
    (contextFilter) => {
      for (const mode of ["focus", "open", "inbox", "done"] as const) {
        expect(
          buildBoard(snapshot, { mode, contextFilter, now }).hiddenNoteCount,
        ).toBe(0);
      }
    },
  );

  it("does not report unrelated notes when the mode has no results", () => {
    const screen = buildBoard(snapshot, {
      mode: "done",
      contextFilter: "Work",
      date: "2026-07-07",
      now,
    });
    expect(screen.isEmpty).toBe(true);
    expect(screen.hiddenNoteCount).toBe(0);
  });

  it("counts Done notes once regardless of task count or Unfinished", () => {
    for (const showFuture of [true, false]) {
      const screen = buildBoard(snapshot, {
        mode: "done",
        contextFilter: "Home",
        date: "2026-07-08",
        showFuture,
        now,
      });
      expect(screen.hiddenNoteCount).toBe(1);
    }
  });

  it("includes orphan notes hidden by a branch filter", () => {
    const screen = buildBoard(snapshot, {
      mode: "inbox",
      contextFilter: "Home",
      now,
    });
    expect(screen.hiddenNoteCount).toBe(1);
    expect(screen.isEmpty).toBe(false);
  });

  it("does not count availability markers as hidden notes", () => {
    const withMarkers = createSnapshot(indexed, {
      nonWorkingWeekdays: [],
      publicHolidays: [],
      personalTimeOff: [
        { id: "day-off", from: "2026-07-08", to: null, label: "Day off" },
      ],
    });
    expect(
      buildBoard(withMarkers, {
        mode: "open",
        contextFilter: "Work",
        now,
      }).hiddenNoteCount,
    ).toBe(4);
    for (const [mode, expected] of [
      ["focus", 2],
      ["open", 5],
    ] as const) {
      const screen = buildBoard(withMarkers, {
        mode,
        contextFilter: "ooo",
        now,
      });
      expect(screen.isEmpty).toBe(false);
      expect(screen.hiddenNoteCount).toBe(expected);
    }
  });

  it("does not show a notice when a branch contains every matching note", () => {
    const workOnly = createSnapshot(
      files(
        filterNoticeFixture.files.filter(
          (file) =>
            !file.path.startsWith("Home/") && file.path !== "Work/Unlinked.md",
        ),
      ),
    );
    for (const mode of ["focus", "open", "inbox", "done"] as const) {
      expect(
        buildBoard(workOnly, { mode, contextFilter: "Work", now })
          .hiddenNoteCount,
      ).toBe(0);
    }
  });
});
