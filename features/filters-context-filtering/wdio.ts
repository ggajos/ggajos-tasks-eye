import { browser, expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";
import { filterNoticeFixture } from "./fixtures";

const BILLING = "Approve the billing domain event contract";
const MENTORING = "Prepare the system design coaching plan";

const originalScenarios = featureScenarios(
  fixture([
    note("Tree Root.md", {
      status: "closed",
      up: "-",
      tasks: [{ text: "Review the tree", completed: "2000-01-01" }],
    }),
    note("Contexts/Mission.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Review the mission", due: "2026-07-11" }],
    }),
    note("anywhere/Billing Platform Modernization.md", {
      status: "open",
      up: "[[Mission]]",
      tasks: [{ text: BILLING, due: "2026-07-08" }],
    }),
    note("Contexts/Leadership.md", {
      status: "open",
      up: "[[Tree Root]]",
      tasks: [{ text: "Review leadership", due: "2026-07-12" }],
    }),
    note("anywhere/Staff Engineering Mentorship.md", {
      status: "open",
      up: "[[Leadership]]",
      tasks: [{ text: MENTORING, due: "2026-07-09" }],
    }),
  ]),
  {
    screenshots: [
      {
        screenshotSlug: "filtered-board",
        async run({ save }) {
          await tasksEyePage.openBoard("open", BILLING);
          await tasksEyePage.setContextFilter("Mission");
          const root = await tasksEyePage.plugin(
            "Billing Platform Modernization",
          );
          await expect(root).toHaveText(expect.stringContaining("Mission"));
          await expect(root).toHaveText(expect.not.stringContaining(MENTORING));
          await expectNotice("2 notes hidden by the Mission filter");
          await save(root);
        },
      },
    ],
  },
);

async function expectNotice(text: string): Promise<void> {
  await browser.waitUntil(
    async () =>
      await browser.execute((expected) => {
        const root = document.querySelector(
          ".workspace-leaf.mod-active .eye-plugin",
        );
        const notice = root?.querySelector(".eye-filter-notice");
        return (
          notice?.textContent === expected &&
          notice.previousElementSibling?.classList.contains("eye-toolbar") &&
          notice.nextElementSibling?.classList.contains("eye-list") &&
          notice.querySelectorAll("button, a, input, select, [tabindex]")
            .length === 0
        );
      }, text),
    { timeout: 10_000, timeoutMsg: `Expected informational notice: ${text}` },
  );
}

async function expectNoNotice(): Promise<void> {
  await browser.waitUntil(
    async () =>
      await browser.execute(
        () =>
          !document.querySelector(
            ".workspace-leaf.mod-active .eye-filter-notice",
          ),
      ),
    { timeout: 10_000, timeoutMsg: "Expected no hidden-note notice" },
  );
}

async function expectFilteredEmpty(): Promise<void> {
  await tasksEyePage.plugin("No matching notes in Quiet.");
  const hasCelebration = await browser.execute(
    () => !!document.querySelector(".workspace-leaf.mod-active .eye-all-clear"),
  );
  expect(hasCelebration).toBe(false);
}

const noticeScenarios = featureScenarios(filterNoticeFixture, {
  acceptance: [
    {
      title:
        "explains filtered emptiness in all four views and clears on global selection",
      async run() {
        for (const [mode, total] of [
          ["focus", 2],
          ["open", 5],
          ["inbox", 2],
          ["done", 2],
        ] as const) {
          if (mode === "done") {
            await tasksEyePage.openDone("Draft the proposal");
          } else {
            await tasksEyePage.openBoard(
              mode,
              mode === "inbox" ? "Repair" : "Proposal",
            );
          }
          await expectNoNotice();
          await tasksEyePage.setContextFilter("Quiet");
          await expectNotice(`${total} notes hidden by the Quiet filter`);
          await expectFilteredEmpty();
          await tasksEyePage.setContextFilter("Root");
          await expectNoNotice();
        }
      },
    },
    {
      title:
        "wraps the informational line inside a narrow panel without adding controls",
      async run() {
        await tasksEyePage.openBoard("focus", "Proposal");
        await tasksEyePage.setContextFilter("Work");
        await expectNotice("1 note hidden by the Work filter");
        const layout = await browser.execute(() => {
          const root = document.querySelector<HTMLElement>(
            ".workspace-leaf.mod-active .eye-plugin",
          );
          const notice = root?.querySelector<HTMLElement>(".eye-filter-notice");
          if (!root || !notice) throw new Error("Missing filter notice");
          const previous = root.getAttribute("style");
          try {
            root.style.width = "100px";
            root.style.maxWidth = "100px";
            const rect = notice.getBoundingClientRect();
            const style = getComputedStyle(notice);
            const contentHeight =
              rect.height -
              Number.parseFloat(style.paddingTop) -
              Number.parseFloat(style.paddingBottom);
            return {
              wraps: contentHeight > Number.parseFloat(style.lineHeight) * 1.5,
              noOverflow: notice.scrollWidth <= notice.clientWidth,
              insidePanel: rect.right <= root.getBoundingClientRect().right + 1,
            };
          } finally {
            if (previous === null) root.removeAttribute("style");
            else root.setAttribute("style", previous);
          }
        });
        expect(layout).toEqual({
          wraps: true,
          noOverflow: true,
          insidePanel: true,
        });
      },
    },
    {
      title: "does not report hidden Done notes on a date with no completions",
      async run() {
        await tasksEyePage.openDone("Draft the proposal");
        await tasksEyePage.setContextFilter("Work");
        await expectNotice("1 note hidden by the Work filter");
        await browser.execute(() => {
          const input = document.querySelector<HTMLInputElement>(
            '.workspace-leaf.mod-active input[aria-label="Completion date"]',
          );
          if (!input) throw new Error("Missing completion date");
          input.value = "2026-07-07";
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
        await tasksEyePage.plugin("No completed tasks for July 07");
        await expectNoNotice();
      },
    },
  ],
  screenshots: [
    {
      screenshotSlug: "filtered-focus",
      async run({ save }) {
        await tasksEyePage.openBoard("focus", "Proposal");
        await tasksEyePage.setContextFilter("Work");
        await expectNotice("1 note hidden by the Work filter");
        await save(await tasksEyePage.plugin("Send the proposal"));
      },
    },
    {
      screenshotSlug: "filtered-inbox-empty",
      async run({ save }) {
        await tasksEyePage.openBoard("inbox", "Repair");
        await tasksEyePage.setContextFilter("Work");
        await expectNotice("2 notes hidden by the Work filter");
        const root = await tasksEyePage.plugin("No matching notes in Work.");
        await expect(root).toHaveText(
          expect.not.stringContaining("Inbox zero."),
        );
        await save(root);
      },
    },
    {
      screenshotSlug: "filtered-done",
      async run({ save }) {
        await tasksEyePage.openDone("Draft the proposal");
        await tasksEyePage.setContextFilter("Work");
        await expectNotice("1 note hidden by the Work filter");
        await save(await tasksEyePage.plugin("Review the proposal"));
      },
    },
    {
      screenshotSlug: "filtered-focus-empty",
      async run({ save }) {
        await tasksEyePage.openBoard("focus", "Proposal");
        await tasksEyePage.setContextFilter("Quiet");
        await expectNotice("2 notes hidden by the Quiet filter");
        await expectFilteredEmpty();
        await save(await tasksEyePage.plugin("No matching notes in Quiet."));
      },
    },
  ],
});

export const acceptanceScenarios = noticeScenarios.acceptanceScenarios;
export const screenshotScenarios = [
  ...originalScenarios.screenshotScenarios,
  ...noticeScenarios.screenshotScenarios,
];
