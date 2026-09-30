import { beforeEach, describe, expect, it } from "vitest";
import type { BoardScreen } from "../src/board";
import { boardContexts, buildBoard } from "../src/board";
import { buildEyeFilesFromMarkdown } from "../src/indexer";
import type { RenderItem } from "../src/model";
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

const vault = buildEyeFilesFromMarkdown([
  note("Root.md", "-", "- [x] done ✅ 2026-07-01", "closed"),
  note("Work.md", "[[Root]]", "", "closed"),
  note("Home.md", "[[Root]]", "", "closed"),
  note("Work/Overdue.md", "[[Work]]", "- [ ] late 📅 2026-07-16"),
  note("Work/Today.md", "[[Work]]", "- [ ] now 📅 2026-07-17"),
  note("Home/Monday.md", "[[Home]]", "- [ ] next 📅 2026-07-20"),
  note("Home/Undated.md", "[[Home]]", "- [ ] someday"),
]);

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
      availability,
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
      availability,
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
      availability,
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
      availability,
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
      availability,
    });

    expect(screen.isEmpty).toBe(true);
  });

  it("offers the OOO context only for Focus and Open", () => {
    expect(boardContexts(vault, "open", "*").contexts).toEqual([
      "Home",
      "ooo",
      "Work",
    ]);
    expect(boardContexts(vault, "inbox", "*").contexts).toEqual([
      "Home",
      "Work",
    ]);
    expect(boardContexts(vault, "done", "Gone").contextFilter).toBe("Root");
  });
});
