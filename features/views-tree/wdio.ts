import { browser, expect } from "@wdio/globals";
import { Key } from "webdriverio";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const ROOT = "Life and the projects I want to move forward";
const CONTEXT = "Work";
const PROJECT = "Website Refresh and the customer launch";
const CURRENT = "Homepage Copy and the detailed messaging review";
const CHILD_A = "Draft Outline";
const GRANDCHILD_A = "First Draft";
const GREAT_GRANDCHILD_A = "Edit the opening and check the final wording";
const CHILD_B = "Review With Marta";
const GRANDCHILD_B = "Review Notes";
const LONG_CHILD = "Prepare the detailed launch communication plan";
const UNBROKEN = "LaunchCommunicationChecklistForEveryCustomerFacingChannel";
const DEEP_CHILD = "Check the customer channels";
const pathFor = (name: string) => `Work/${name}.md`;
const ancestors = [ROOT, CONTEXT, PROJECT, CURRENT];
const allNames = [
  ...ancestors,
  CHILD_A,
  GRANDCHILD_A,
  GREAT_GRANDCHILD_A,
  LONG_CHILD,
  UNBROKEN,
  DEEP_CHILD,
  CHILD_B,
  GRANDCHILD_B,
];
const firstLevel = [...ancestors, CHILD_A, LONG_CHILD, CHILD_B];
const secondLevel = [
  ...ancestors,
  CHILD_A,
  GRANDCHILD_A,
  LONG_CHILD,
  UNBROKEN,
  CHILD_B,
  GRANDCHILD_B,
];

async function openTree() {
  await tasksEyePage.openPreview(pathFor(CURRENT), CURRENT);
  const root = await tasksEyePage.openTree(CURRENT);
  await tasksEyePage.waitForTreeNotes(allNames);
  await browser.execute(() => {
    const tree = document.querySelector<HTMLElement>(".eye-note-tree")!;
    const pane = tree.closest<HTMLElement>(".view-content")!;
    pane.style.width = "280px";
    pane.style.minWidth = "280px";
    pane.style.maxWidth = "280px";
    tree.style.width = "260px";
    tree.style.boxSizing = "border-box";
  });
  return root;
}

async function expectWrappedTitles() {
  const wrappedNames = [ROOT, CURRENT, LONG_CHILD, UNBROKEN];
  const geometry = await browser.execute(
    (names) => {
      const tree = document.querySelector<HTMLElement>(".eye-note-tree")!;
      return names.map((name) => {
        const title = [
          ...tree.querySelectorAll<HTMLElement>(".eye-tree-title"),
        ].find((candidate) => candidate.textContent === name)!;
        const row = title.closest<HTMLElement>(".eye-tree-row")!;
        const lines = new Map<number, { left: number; right: number }>();
        const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
        // Character ranges measure actual text positions, including continuation lines.
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          for (
            let index = 0;
            index < (node.textContent?.length ?? 0);
            index++
          ) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + 1);
            const rect = range.getBoundingClientRect();
            const line = lines.get(rect.top);
            lines.set(rect.top, {
              left: Math.min(line?.left ?? rect.left, rect.left),
              right: Math.max(line?.right ?? rect.right, rect.right),
            });
          }
        }
        const bounds = title.getBoundingClientRect();
        const rowStyle = getComputedStyle(row);
        const textHeight =
          lines.size * parseFloat(getComputedStyle(title).lineHeight);
        const entryHeight =
          row.getBoundingClientRect().height +
          parseFloat(rowStyle.marginTop) +
          parseFloat(rowStyle.marginBottom);
        return {
          name,
          text: title.textContent,
          lineCount: lines.size,
          aligned: [...lines.values()].every(
            (line) => Math.abs(line.left - bounds.left) < 1,
          ),
          contained: [...lines.values()].every(
            (line) => line.right <= bounds.right + 1,
          ),
          rowVisible: row.getClientRects().length > 0,
          panelFits: tree.scrollWidth <= tree.clientWidth + 1,
          dense: entryHeight <= textHeight + 6,
          toggleCount: row.querySelectorAll("button").length,
        };
      });
    },
    [...wrappedNames, CONTEXT, CHILD_A, GRANDCHILD_B],
  );
  for (const item of geometry) {
    expect(item.text).toBe(item.name);
    if (wrappedNames.includes(item.name))
      expect(item.lineCount).toBeGreaterThan(1);
    else expect(item.lineCount).toBe(1);
    expect(item.dense).toBe(true);
    expect(item.aligned).toBe(true);
    expect(item.contained).toBe(true);
    expect(item.rowVisible).toBe(true);
    expect(item.panelFits).toBe(true);
  }
  expect(geometry.find((item) => item.name === UNBROKEN)?.toggleCount).toBe(1);
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  fixture(
    [
      note(`${ROOT}.md`, { status: "open", up: "-", tasks: ["Plan the week"] }),
      ...(
        [
          [CONTEXT, ROOT],
          [PROJECT, CONTEXT],
          [CURRENT, PROJECT],
          [CHILD_A, CURRENT],
          [GRANDCHILD_A, CHILD_A],
          [GREAT_GRANDCHILD_A, GRANDCHILD_A],
          [LONG_CHILD, CURRENT],
          [UNBROKEN, LONG_CHILD],
          [DEEP_CHILD, UNBROKEN],
          [CHILD_B, CURRENT],
          [GRANDCHILD_B, CHILD_B],
        ] as const
      ).map(([name, parent]) =>
        note(pathFor(name), {
          status: "open",
          up: `[[${parent}]]`,
          tasks: ["Move this work forward"],
        }),
      ),
      note("Home/Home.md", {
        status: "open",
        up: `[[${ROOT}]]`,
        tasks: ["Water the plants"],
      }),
      note("Outside/Outside.md", {
        status: "open",
        up: `[[${ROOT}]]`,
        tasks: ["Not indexed"],
      }),
    ],
    { settings: { excludedFolderPaths: ["Outside"] } },
  ),
  {
    acceptance: [
      {
        title:
          "shows full titles with aligned wrapping and dense spacing in a narrow panel",
        async run() {
          await openTree();
          await expectWrappedTitles();
          expect(
            await tasksEyePage.treeExpanded(GREAT_GRANDCHILD_A),
          ).toBeNull();
          expect(await tasksEyePage.treeExpanded(ROOT)).toBeNull();
          const indent = await browser.execute(
            (names) =>
              names.map((name) => {
                const title = [
                  ...document.querySelectorAll<HTMLElement>(".eye-tree-title"),
                ].find((candidate) => candidate.textContent === name)!;
                return title.getBoundingClientRect().left;
              }),
            [CURRENT, PROJECT, CHILD_A, GRANDCHILD_A],
          );
          expect(indent[1]! - indent[0]!).toBeCloseTo(14, 0);
          expect(indent[2]! - indent[0]!).toBeCloseTo(14, 0);
          expect(indent[3]! - indent[0]!).toBeCloseTo(28, 0);
        },
      },
      {
        title:
          "toggles real child visibility with mouse, Enter and Space without navigating",
        async run() {
          await openTree();
          const withoutDrafts = allNames.filter(
            (name) => ![GRANDCHILD_A, GREAT_GRANDCHILD_A].includes(name),
          );
          await tasksEyePage.toggleTreeNote(CHILD_A);
          await tasksEyePage.waitForTreeNotes(withoutDrafts);
          expect(await tasksEyePage.treeExpanded(CHILD_A)).toBe("false");
          await tasksEyePage.toggleTreeNote(CHILD_A, "Enter");
          await tasksEyePage.waitForTreeNotes(allNames);
          await tasksEyePage.toggleTreeNote(CHILD_A, "Space");
          await tasksEyePage.waitForTreeNotes(withoutDrafts);
          await tasksEyePage.toggleTreeNote(CHILD_A, "Space");
          await tasksEyePage.waitForTreeNotes(allNames);
          expect(
            await browser.executeObsidian(
              ({ app }) => app.workspace.getActiveFile()?.path,
            ),
          ).toBe(pathFor(CURRENT));
        },
      },
      {
        title:
          "collapses everything and reveals exactly one level on each click",
        async run() {
          await openTree();
          await tasksEyePage.treeAction("Collapse all");
          await tasksEyePage.waitForTreeNotes(ancestors);
          expect(await tasksEyePage.treeExpanded(CURRENT)).toBe("false");
          await tasksEyePage.treeAction("Expand one level");
          await tasksEyePage.waitForTreeNotes(firstLevel);
          await tasksEyePage.treeAction("Expand one level");
          await tasksEyePage.waitForTreeNotes(secondLevel);
          await tasksEyePage.treeAction("Expand one level");
          await tasksEyePage.waitForTreeNotes(allNames);
          await tasksEyePage.treeAction("Collapse all");
          await tasksEyePage.treeAction("Expand all");
          await tasksEyePage.waitForTreeNotes(allNames);
        },
      },
      {
        title: "expands mixed branches one step and keeps manual child choices",
        async run() {
          await openTree();
          await tasksEyePage.toggleTreeNote(GRANDCHILD_A);
          await tasksEyePage.toggleTreeNote(CHILD_A);
          await tasksEyePage.toggleTreeNote(CHILD_A);
          await tasksEyePage.waitForTreeNotes(
            allNames.filter((name) => name !== GREAT_GRANDCHILD_A),
          );
          await tasksEyePage.treeAction("Expand all");
          await tasksEyePage.toggleTreeNote(CHILD_A);
          await tasksEyePage.toggleTreeNote(LONG_CHILD);
          await tasksEyePage.treeAction("Expand one level");
          await tasksEyePage.waitForTreeNotes(
            allNames.filter(
              (name) => ![GREAT_GRANDCHILD_A, DEEP_CHILD].includes(name),
            ),
          );
          expect(await tasksEyePage.treeExpanded(GRANDCHILD_A)).toBe("false");
          expect(await tasksEyePage.treeExpanded(UNBROKEN)).toBe("false");
        },
      },
      {
        title:
          "retains choices during refreshes and resets on navigation and reopening",
        async run() {
          await openTree();
          await tasksEyePage.treeAction("Collapse all");
          await tasksEyePage.refreshTree();
          await tasksEyePage.waitForTreeNotes(ancestors);
          await tasksEyePage.openPreview("Home/Home.md", "Home");
          await tasksEyePage.waitForTreeNotes([ROOT, "Home"]);
          await tasksEyePage.openPreview(pathFor(CURRENT), CURRENT);
          await tasksEyePage.waitForTreeNotes(allNames);
          await tasksEyePage.treeAction("Collapse all");
          await tasksEyePage.closeTree();
          await tasksEyePage.openTree(CURRENT);
          await tasksEyePage.waitForTreeNotes(allNames);
        },
      },
      {
        title: "opens native note links and re-anchors the tree",
        async run() {
          await openTree();
          await tasksEyePage.clickTreeNote(CHILD_A);
          await tasksEyePage.waitForTreeNotes([
            ...ancestors,
            CHILD_A,
            GRANDCHILD_A,
            GREAT_GRANDCHILD_A,
          ]);
          expect(
            await browser.executeObsidian(
              ({ app }) => app.workspace.getActiveFile()?.path,
            ),
          ).toBe(pathFor(CHILD_A));
        },
      },
      {
        title: "shows an empty state for an excluded note",
        async run() {
          await openTree();
          await tasksEyePage.openPreview("Outside/Outside.md", "Outside");
          await tasksEyePage.openTree("Open an indexed note to see its tree.");
          expect(await tasksEyePage.treeNoteNames()).toEqual([]);
        },
      },
      {
        title: "modifier-click opens a native link in another leaf",
        async run() {
          await openTree();
          const before = await browser.executeObsidian(
            ({ app }) => app.workspace.getLeavesOfType("markdown").length,
          );
          await browser.action("key").down(Key.Control).perform(true);
          try {
            await tasksEyePage.clickTreeNote(CHILD_A);
          } finally {
            await browser.releaseActions();
          }
          await tasksEyePage.waitForTreeNotes([
            ...ancestors,
            CHILD_A,
            GRANDCHILD_A,
            GREAT_GRANDCHILD_A,
          ]);
          const after = await browser.executeObsidian(
            ({ app }) => app.workspace.getLeavesOfType("markdown").length,
          );
          expect(after).toBe(before + 1);
        },
      },
    ],
    screenshots: [
      {
        screenshotSlug: "tree-panel",
        async run({ save }) {
          const root = await openTree();
          await expectWrappedTitles();
          await save(root);
        },
      },
      {
        screenshotSlug: "tree-collapsed",
        async run({ save }) {
          const root = await openTree();
          await tasksEyePage.treeAction("Collapse all");
          await tasksEyePage.waitForTreeNotes(ancestors);
          await save(root);
        },
      },
      {
        screenshotSlug: "tree-one-level",
        async run({ save }) {
          const root = await openTree();
          await tasksEyePage.treeAction("Collapse all");
          await tasksEyePage.treeAction("Expand one level");
          await tasksEyePage.waitForTreeNotes(firstLevel);
          await save(root);
        },
      },
      {
        screenshotSlug: "tree-mixed",
        async run({ save }) {
          const root = await openTree();
          await tasksEyePage.toggleTreeNote(LONG_CHILD);
          await tasksEyePage.toggleTreeNote(CHILD_B);
          await tasksEyePage.waitForTreeNotes(
            allNames.filter(
              (name) => ![UNBROKEN, DEEP_CHILD, GRANDCHILD_B].includes(name),
            ),
          );
          await save(root);
        },
      },
    ],
  },
);
