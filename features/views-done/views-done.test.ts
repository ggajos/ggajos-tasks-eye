import { describe, expect, it, vi } from "vitest";
import type { StatusNoteGroup, StatusTaskNode } from "../../src/completedTasks";
import {
  cleanCompletedTaskText,
  collectStatusGroups,
} from "../../src/completedTasks";
import { file } from "../testSupport";

const DATE = "2026-07-08";
const PAST = "2026-07-07";
const FUTURE = "2099-01-01";

function groupsFor(
  markdown: string,
  { date = DATE, showFuture = true } = {},
  path = "Architecture/Governance.md",
): StatusNoteGroup[] {
  const grouped = collectStatusGroups([file(path, markdown)], date, showFuture);
  return grouped.Architecture ?? [];
}

function flatten(nodes: StatusTaskNode[]): StatusTaskNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

describe("Done/Status view", () => {
  it("cleans completion dates, tags, and priority signifiers", () => {
    expect(cleanCompletedTaskText("Ship feature #work ⏫ ✅ 2026-07-07")).toBe(
      "Ship feature",
    );
  });

  it("collects tasks completed on the selected date only", () => {
    const groups = groupsFor(
      `---
status: closed
---

- [x] Approved ADR-042 ✅ 2026-07-08
- [x] Reviewed roadmap ✅ 2026-07-07
`,
    );

    const matched = flatten(groups[0]!.nodes).filter((n) => n.matched);
    expect(matched.map((n) => n.text)).toEqual(["Approved ADR-042"]);
    expect(groups[0]!.matchedCount).toBe(1);
  });

  it("shows unfinished tasks with past, present, and future due dates when enabled", () => {
    const configuredToday = (window as Window & { TASKS_EYE_TODAY?: string })
      .TASKS_EYE_TODAY;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 8, 12));
    delete (window as Window & { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY;

    try {
      const markdown = `---
status: open
---

- [x] Shipped today ✅ 2026-07-08
- [ ] Catch up on yesterday's work 📅 ${PAST}
- [ ] Handle today's follow-up 📅 ${DATE}
- [ ] Plan next quarter 📅 ${FUTURE}
- [ ] Capture an undated thought
`;
      const on = groupsFor(markdown, { showFuture: true });
      const matched = flatten(on[0]!.nodes).filter((n) => n.matched);
      expect(matched.map((n) => n.text)).toEqual([
        "Shipped today",
        `Catch up on yesterday's work 📅 ${PAST}`,
        `Handle today's follow-up 📅 ${DATE}`,
        `Plan next quarter 📅 ${FUTURE}`,
      ]);
      expect(matched.slice(1).every((n) => n.future)).toBe(true);
      expect(matched.slice(1).every((n) => !n.completed)).toBe(true);
      expect(on[0]!.matchedCount).toBe(4);

      const off = groupsFor(markdown, { showFuture: false });
      expect(flatten(off[0]!.nodes).map((n) => n.text)).toEqual([
        "Shipped today",
      ]);
      expect(off[0]!.matchedCount).toBe(1);
    } finally {
      if (configuredToday === undefined) {
        delete (window as Window & { TASKS_EYE_TODAY?: string })
          .TASKS_EYE_TODAY;
      } else {
        (window as Window & { TASKS_EYE_TODAY?: string }).TASKS_EYE_TODAY =
          configuredToday;
      }
      vi.useRealTimers();
    }
  });

  it("hides unfinished due-dated tasks in notes without a same-day completion", () => {
    const grouped = collectStatusGroups(
      [
        file(
          "Architecture/Upcoming Only.md",
          `---
status: open
---

- [ ] Plan next quarter 📅 ${FUTURE}
`,
        ),
      ],
      DATE,
      true,
    );

    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it("shows an ancestor of a completed subtask as a context row without a check", () => {
    const groups = groupsFor(
      `---
status: open
---

- [ ] Parent task
    - [x] Child done ✅ 2026-07-08
`,
    );

    const roots = groups[0]!.nodes;
    expect(roots).toHaveLength(1);
    const parent = roots[0]!;
    expect(parent.text).toBe("Parent task");
    expect(parent.matched).toBe(false);
    expect(parent.completed).toBe(false);
    expect(parent.future).toBe(false);

    const child = parent.children[0]!;
    expect(child.matched).toBe(true);
    expect(child.completed).toBe(true);
    expect(groups[0]!.matchedCount).toBe(1);
  });

  it("keeps every completed subtask when all are done", () => {
    const groups = groupsFor(
      `---
status: open
---

- [ ] Parent task
    - [x] First ✅ 2026-07-08
    - [x] Second ✅ 2026-07-08
`,
    );

    const parent = groups[0]!.nodes[0]!;
    expect(parent.matched).toBe(false);
    expect(parent.children.map((c) => c.text)).toEqual(["First", "Second"]);
    expect(groups[0]!.matchedCount).toBe(2);
  });

  it("does not pull in unfinished, undated descendants of a completed parent", () => {
    const groups = groupsFor(
      `---
status: open
---

- [x] Parent done ✅ 2026-07-08
    - [ ] Still open child
`,
    );

    const parent = groups[0]!.nodes[0]!;
    expect(parent.matched).toBe(true);
    expect(parent.children).toHaveLength(0);
    expect(groups[0]!.matchedCount).toBe(1);
  });

  it("mixes a completed task and an unfinished due-dated task within one note tree", () => {
    const groups = groupsFor(
      `---
status: open
---

- [ ] Milestone
    - [x] Done step ✅ 2026-07-08
    - [ ] Upcoming step 📅 ${FUTURE}
`,
    );

    const parent = groups[0]!.nodes[0]!;
    expect(parent.matched).toBe(false);
    const [done, unfinished] = parent.children;
    expect(done!.completed).toBe(true);
    expect(unfinished!.future).toBe(true);
    expect(groups[0]!.matchedCount).toBe(2);
  });

  it("omits notes with no matching tasks", () => {
    const grouped = collectStatusGroups(
      [
        file(
          "Architecture/Idle.md",
          `---
status: open
---

- [ ] Nothing due yet
- [x] Completed on another day ✅ 2000-01-01
`,
        ),
      ],
      DATE,
      true,
    );

    expect(Object.keys(grouped)).toHaveLength(0);
  });
});
