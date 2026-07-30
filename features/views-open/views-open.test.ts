import { describe, expect, it } from "vitest";
import { BoardCollapseState } from "../../src/boardCollapse";
import { DUE_BUCKETS } from "../../src/constants";
import { buildRowModel, selectRows } from "../../src/model";
import { file, rowNames } from "../testSupport";

describe("Open view feature", () => {
  it("starts with only Today expanded in Open", () => {
    const state = new BoardCollapseState();

    expect(
      Object.fromEntries(
        DUE_BUCKETS.map((bucket) => [
          bucket.key,
          state.isCollapsed("open", bucket.key),
        ]),
      ),
    ).toEqual({
      noDue: true,
      today: false,
      tomorrow: true,
      thisMonth: true,
      nextMonth: true,
      future: true,
    });
  });

  it("keeps manual choices per mode in one pane and resets a new pane", () => {
    const state = new BoardCollapseState();

    expect(state.toggle("open", "tomorrow")).toBe(false);
    expect(state.toggle("open", "today")).toBe(true);
    expect(state.isCollapsed("open", "tomorrow")).toBe(false);
    expect(state.isCollapsed("open", "today")).toBe(true);
    expect(state.isCollapsed("inbox", "tomorrow")).toBe(false);

    const replacementPane = new BoardCollapseState();
    expect(replacementPane.isCollapsed("open", "tomorrow")).toBe(true);
    expect(replacementPane.isCollapsed("open", "today")).toBe(false);
  });

  it("shows open notes and excludes unsupported statuses", () => {
    const rows = selectRows(
      [
        file("Growth/Open.md", "---\nstatus: open\n---\n\n- [ ] open"),
        file("Growth/Default Open.md", "- [ ] default open"),
        file(
          "Growth/Reviewing.md",
          "---\nstatus: reviewing\n---\n\n- [ ] reviewing",
        ),
      ],
      "open",
      "*",
    );

    expect(rowNames(rows)).toEqual(["Default Open", "Open"]);
  });

  it("uses the earliest unfinished due task as the row action", () => {
    const row = buildRowModel(
      file(
        "Growth/Plan.md",
        `---
status: open
---

- [ ] later 📅 2026-07-20
- [ ] earlier 📅 2026-07-08
`,
      ),
    );

    expect(row.actionLabel).toBe("earlier");
    expect(row.earliestTask?.dueIso).toBe("2026-07-08");
  });
});
