import { browser, expect } from "@wdio/globals";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import {
  tasksEyePage,
  type WdioElement,
} from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const VIEW_TYPE = "ggajos-tasks-eye-view";
const LEGACY_COMPLETED_VIEW_TYPE = "ggajos-tasks-eye-completed-view";
const COMPLETED = "Approved ADR-042 for tenant isolation";

const doneFixture = fixture([
  note("Tree Root.md", {
    status: "closed",
    up: "-",
    tasks: [{ text: "Review the tree", completed: "2000-01-01" }],
  }),
  note("Architecture.md", {
    status: "closed",
    up: "[[Tree Root]]",
    tasks: [{ text: "Review architecture", completed: "2000-01-01" }],
  }),
  note("Architecture/Architecture Governance.md", {
    status: "closed",
    up: "[[Architecture]]",
    tasks: [{ text: COMPLETED, completed: "2026-07-08" }],
  }),
  note("Architecture/Billing Platform.md", {
    status: "open",
    up: "[[Architecture]]",
    tasks: [
      {
        text: "Approve the billing domain event contract",
        due: "2026-07-08",
      },
    ],
  }),
  note("Architecture/Technology Radar.md", {
    status: "open",
    up: "[[Architecture]]",
    tasks: [{ text: "Review platform isolation", due: "2026-07-08" }],
  }),
]);

async function unifiedViewState() {
  return await browser.executeObsidian(
    ({ app }, viewType, legacyViewType) => {
      const leaves = app.workspace.getLeavesOfType(viewType);
      const view = leaves[0]?.view;
      const state = view?.getState() ?? {};
      return {
        date: state.date,
        doneRibbonCount: document.querySelectorAll(
          '[aria-label="Open Tasks Eye Done"]',
        ).length,
        unfinishedToggleCount: document.querySelectorAll(
          '[aria-label="Show unfinished tasks with a due date"]',
        ).length,
        eyeRibbonCount: document.querySelectorAll(
          '[aria-label="Open Tasks Eye"]',
        ).length,
        icon: view?.getIcon() ?? null,
        legacyLeafCount: app.workspace.getLeavesOfType(legacyViewType).length,
        mode: state.mode,
        title: view?.getDisplayText() ?? null,
        unifiedLeafCount: leaves.length,
      };
    },
    VIEW_TYPE,
    LEGACY_COMPLETED_VIEW_TYPE,
  );
}

async function clickMode(ariaLabel: string): Promise<void> {
  await browser.execute((label) => {
    const button = document.querySelector<HTMLButtonElement>(
      `.workspace-leaf.mod-active button[aria-label="${label}"]`,
    );
    if (!button) throw new Error(`${label} button is missing`);
    button.click();
  }, ariaLabel);
}

export const { acceptanceScenarios, screenshotScenarios: baseScreenshots } =
  featureScenarios(doneFixture, {
    acceptance: [
      {
        title: "uses one native view for work and completed tasks",
        async run() {
          await tasksEyePage.openBoard(
            "open",
            "Approve the billing domain event contract",
          );
          await tasksEyePage.openDone(COMPLETED);

          const state = await unifiedViewState();
          if (
            state.unifiedLeafCount !== 1 ||
            state.legacyLeafCount !== 0 ||
            state.mode !== "done" ||
            state.date !== "2026-07-08" ||
            state.icon !== "eye" ||
            state.title !== "Tasks Eye: Done — 2026-07-08" ||
            state.eyeRibbonCount !== 1 ||
            state.doneRibbonCount !== 0 ||
            state.unfinishedToggleCount !== 1
          ) {
            throw new Error(
              `Unexpected unified Done state: ${JSON.stringify(state)}`,
            );
          }
        },
      },
      {
        title: "remembers tab dates and lets the command jump to today",
        async run() {
          await tasksEyePage.openDone(COMPLETED);
          await browser.execute(() => {
            const input = document.querySelector<HTMLInputElement>(
              '.workspace-leaf.mod-active input[aria-label="Completion date"]',
            );
            if (!input) throw new Error("Completion date input is missing");
            input.value = "2026-07-07";
            input.dispatchEvent(new Event("change", { bubbles: true }));
          });
          await browser.waitUntil(
            async () => (await unifiedViewState()).date === "2026-07-07",
            {
              timeout: 10_000,
              timeoutMsg: "Expected Done to select 2026-07-07",
            },
          );

          await clickMode("Show Open");
          await tasksEyePage.plugin("Technology Radar");
          await clickMode("Show Done");
          await tasksEyePage.plugin("No completed tasks for");

          const remembered = await unifiedViewState();
          if (remembered.mode !== "done" || remembered.date !== "2026-07-07") {
            throw new Error(
              `Done did not remember its date: ${JSON.stringify(remembered)}`,
            );
          }

          await tasksEyePage.openDone(COMPLETED);
          const commandJump = await unifiedViewState();
          if (commandJump.date !== "2026-07-08") {
            throw new Error(
              `Done command did not jump to today: ${JSON.stringify(commandJump)}`,
            );
          }
        },
      },
    ],
    screenshots: [
      {
        screenshotSlug: "done-view",
        async run({ save }) {
          const root = await tasksEyePage.openDone(COMPLETED);
          await expect(root).toHaveText(
            expect.stringContaining("Architecture Governance"),
          );
          await save(root);
        },
      },
    ],
  });

const futureNestingFixture = fixture([
  note("Tree Root.md", {
    status: "closed",
    up: "-",
    tasks: [{ text: "Review the tree", completed: "2000-01-01" }],
  }),
  note("Architecture.md", {
    status: "closed",
    up: "[[Tree Root]]",
    tasks: [{ text: "Review architecture", completed: "2000-01-01" }],
  }),
  note(
    "Architecture/Platform Rollout.md",
    `---
status: open
up: "[[Architecture]]"
---

- [ ] Cutover milestone
    - [x] Freeze legacy writes ✅ 2026-07-08
    - [ ] Review yesterday's rollout notes 📅 2026-07-07
    - [ ] Confirm today's rollout status 📅 2026-07-08
    - [ ] Enable dual-read 📅 2026-07-20
    - [ ] Draft comms plan
- [x] Sign-off recorded ⏫ ✅ 2026-07-08
    - [x] Security review ✅ 2026-07-08
    - [x] Data review ✅ 2026-07-08
`,
  ),
  note(
    "Architecture/Data Mesh.md",
    `---
status: open
up: "[[Architecture]]"
---

- [ ] Domain onboarding
    - [ ] Payments squad
        - [x] Contract approved ✅ 2026-07-08
- [x] Retire ETL job ✅ 2026-07-08
    - [ ] Decommission runner
- [ ] Roadmap review 📅 2026-07-25
    - [x] Pre-read circulated ✅ 2026-07-08
    - [ ] Collect feedback 📅 2026-07-30
`,
  ),
]);

export const screenshotScenarios = [
  ...baseScreenshots,
  {
    screenshotSlug: "done-future-nesting",
    fixture: futureNestingFixture,
    async run({ save }: { save: (element: WdioElement) => Promise<void> }) {
      const root = await tasksEyePage.openDone("Freeze legacy writes");
      await expect(root).toHaveText(
        expect.stringContaining("Enable dual-read"),
      );
      await expect(root).toHaveText(
        expect.stringContaining("Review yesterday's rollout notes"),
      );
      await expect(root).toHaveText(
        expect.stringContaining("Confirm today's rollout status"),
      );
      await expect(root).toHaveText(
        expect.stringContaining("Contract approved"),
      );
      await save(root);
    },
  },
];
