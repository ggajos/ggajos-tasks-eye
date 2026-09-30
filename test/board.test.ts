import { beforeEach, describe, expect, it } from "vitest";
import type { BoardScreen } from "../src/board";
import { boardContexts, buildBoard } from "../src/board";
import { buildEyeFilesFromMarkdown } from "../src/indexer";
import type { RenderItem } from "../src/model";
import { createSnapshot } from "../src/snapshot";
import type { AvailabilityConfig } from "../src/vacation";

const NOW = new Date(2026, 6, 17);

const availability: AvailabilityConfig = {
  nonWorkingWeekdays: [0, 6],
  publicHolidays: [],
  personalTimeOff: [
    { id: "trip", from: "2026-07-18", to: "2026-07-18", label: "Trip" },
  ],
};

function note(path: string, up: string, body = "", status = "open") {
  return {
    path,
    markdown: `---\nstatus: ${status}\nup: ${up}\n---\n\n${body}`,
  };
}

const files = buildEyeFilesFromMarkdown([
  note("Root.md", "-", "- [x] done ✅ 2026-07-01", "closed"),
  note("Work.md", "[[Root]]", "", "closed"),
  note("Home.md", "[[Root]]", "", "closed"),
  note("Work/Overdue.md", "[[Work]]", "- [ ] late 📅 2026-07-16"),
  note("Work/Today.md", "[[Work]]", "- [ ] now 📅 2026-07-17"),
  note("Home/Monday.md", "[[Home]]", "- [ ] next 📅 2026-07-20"),
  note("Home/Undated.md", "[[Home]]", "- [ ] someday"),
  note(
    "Home/Home Review.md",
    "[[Home]]",
    "- [x] tidied ✅ 2026-07-01",
    "closed",
  ),
]);
const vault = createSnapshot(files, availability);

function itemLabels(items: readonly RenderItem[]): string[] {
  return items.map((item) =>
    item.kind === "task"
      ? item.model.file.basename
      : `ooo:${item.marker.label}`,
  );
}

function bucketKeys(screen: BoardScreen): string[] {
  return screen.body.kind === "buckets"
    ? screen.body.buckets.map((bucket) => bucket.key)
    : [];
}

describe("Board module", () => {
  beforeEach(() => {
    (window as Window & { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY =
      "2026-07-17";
  });

  it("cuts Focus to overdue and today, with tab counts", () => {
    const screen = buildBoard(vault, {
      mode: "focus",
      contextFilter: "*",
      now: NOW,
    });

    expect(screen.body.kind).toBe("focus");
    if (screen.body.kind !== "focus") return;
    expect(itemLabels(screen.body.items)).toEqual(["Overdue", "Today"]);
    expect(screen.counts.focus).toBe(2);
    expect(screen.counts.inbox).toBeGreaterThan(0);
    expect(screen.isEmpty).toBe(false);
  });

  it("interleaves OOO markers into Open buckets across all contexts", () => {
    const screen = buildBoard(vault, {
      mode: "open",
      contextFilter: "*",
      now: NOW,
    });

    expect(bucketKeys(screen)).toEqual([
      "overdue",
      "noDue",
      "today",
      "tomorrow",
      "nextWeek",
    ]);
    if (screen.body.kind !== "buckets") return;
    const trip = screen.body.buckets.find((b) => b.key === "tomorrow");
    expect(trip?.taskCount).toBe(0);
    expect(trip?.days.flatMap((day) => day.items)[0]?.kind).toBe("marker");
  });

  it("uses the OOO context to show only markers in Open", () => {
    const screen = buildBoard(vault, {
      mode: "open",
      contextFilter: "ooo",
      now: NOW,
    });

    if (screen.body.kind !== "buckets") throw new Error("expected buckets");
    const items = screen.body.buckets.flatMap((b) =>
      b.days.flatMap((d) => d.items),
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.kind === "marker")).toBe(true);
  });

  it("drops markers when filtering to a specific context", () => {
    const screen = buildBoard(vault, {
      mode: "open",
      contextFilter: "Work",
      now: NOW,
    });

    if (screen.body.kind !== "buckets") throw new Error("expected buckets");
    const items = screen.body.buckets.flatMap((b) =>
      b.days.flatMap((d) => d.items),
    );
    expect(itemLabels(items)).toEqual(["Overdue", "Today"]);
  });

  it("reports an empty Focus screen", () => {
    const screen = buildBoard(vault, {
      mode: "focus",
      contextFilter: "Home",
      now: NOW,
    });

    expect(screen.isEmpty).toBe(true);
  });

  it("offers the OOO context only for Focus and Open", () => {
    expect(boardContexts(files, "open", "*").contexts).toEqual([
      "Home",
      "ooo",
      "Work",
    ]);
    expect(boardContexts(files, "inbox", "*").contexts).toEqual([
      "Home",
      "Work",
    ]);
    expect(boardContexts(files, "done", "Gone").contextFilter).toBe("Root");
  });

  it("prepares Done: sorted contexts, note groups, totals", () => {
    const screen = buildBoard(vault, {
      mode: "done",
      contextFilter: "*",
      now: NOW,
      date: "2026-07-01",
      showFuture: false,
    });

    expect(screen.body.kind).toBe("done");
    if (screen.body.kind !== "done") return;
    expect(screen.body.contexts.map((c) => c.context)).toEqual([
      "Home",
      "Root",
    ]);
    expect(
      screen.body.contexts.map((c) => ({
        context: c.context,
        matchedCount: c.matchedCount,
        files: c.groups.map((group) => group.fileName),
      })),
    ).toEqual([
      { context: "Home", matchedCount: 1, files: ["Home Review"] },
      { context: "Root", matchedCount: 1, files: ["Root"] },
    ]);
    expect(screen.isEmpty).toBe(false);
  });

  it("narrows Done to the selected context and reports empty days", () => {
    const filtered = buildBoard(vault, {
      mode: "done",
      contextFilter: "Work",
      now: NOW,
      date: "2026-07-01",
    });
    expect(filtered.isEmpty).toBe(true);

    const emptyDay = buildBoard(vault, {
      mode: "done",
      contextFilter: "*",
      now: NOW,
      date: "2026-07-02",
    });
    expect(emptyDay.body.kind).toBe("done");
    if (emptyDay.body.kind !== "done") return;
    expect(emptyDay.body.contexts).toEqual([]);
    expect(emptyDay.isEmpty).toBe(true);
  });

  it("evaluates every date decision from request.now alone", () => {
    (window as Window & { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY =
      "2000-01-01";

    const focus = buildBoard(vault, {
      mode: "focus",
      contextFilter: "*",
      now: NOW,
    });
    expect(focus.body.kind).toBe("focus");
    if (focus.body.kind !== "focus") return;
    expect(itemLabels(focus.body.items)).toEqual(["Overdue", "Today"]);
    expect(focus.counts).toEqual({ focus: 2, inbox: 2 });

    const open = buildBoard(vault, {
      mode: "open",
      contextFilter: "*",
      now: NOW,
    });
    expect(bucketKeys(open)).toEqual([
      "overdue",
      "noDue",
      "today",
      "tomorrow",
      "nextWeek",
    ]);
    if (open.body.kind !== "buckets") return;
    const today = open.body.buckets.find((bucket) => bucket.key === "today");
    expect(today?.days[0]?.label).toBe("July 17 - Friday");

    const inbox = buildBoard(vault, {
      mode: "inbox",
      contextFilter: "*",
      now: NOW,
    });
    if (inbox.body.kind !== "buckets") throw new Error("expected buckets");
    const overdueRow = inbox.body.buckets[0]?.days[0]?.items[0];
    expect(
      overdueRow?.kind === "task" &&
        overdueRow.model.errors.some(
          (violation) => violation.code === "open-task-overdue",
        ),
    ).toBe(true);
  });
});
