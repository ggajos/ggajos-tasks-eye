import { browser, expect } from "@wdio/globals";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const VIEW_TYPE = "ggajos-tasks-eye-view";
const LEGACY_COMPLETED_VIEW_TYPE = "ggajos-tasks-eye-completed-view";
const COMPLETED = "Approved ADR-042 for tenant isolation";

const doneFixture = fixture([
    note("Architecture/Architecture Governance.md", {
      status: "closed",
      tasks: [{ text: COMPLETED, completed: "2026-07-08" }],
    }),
    note("Architecture/Billing Platform.md", {
      status: "open",
      tasks: [{
        text: "Approve the billing domain event contract",
        due: "2026-07-08",
      }],
    }),
    note("Architecture/Technology Radar.md", {
      status: "hold",
      tasks: [{ text: "Review platform isolation", due: "2026-07-08" }],
    }),
]);

async function unifiedViewState() {
  return await browser.executeObsidian(({ app }, viewType, legacyViewType) => {
    const leaves = app.workspace.getLeavesOfType(viewType);
    const view = leaves[0]?.view;
    const state = view?.getState() ?? {};
    return {
      date: state.date,
      doneRibbonCount: document.querySelectorAll(
        '[aria-label="Open Tasks Eye Done"]',
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
  }, VIEW_TYPE, LEGACY_COMPLETED_VIEW_TYPE);
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

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  doneFixture,
  { acceptance: [
    {
      title: "uses one native view for work and completed tasks",
      async run() {
        await tasksEyePage.openBoard("open", "Approve the billing domain event contract");
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
          state.doneRibbonCount !== 0
        ) {
          throw new Error(`Unexpected unified Done state: ${JSON.stringify(state)}`);
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
        await browser.waitUntil(async () =>
          (await unifiedViewState()).date === "2026-07-07", {
          timeout: 10_000,
          timeoutMsg: "Expected Done to select 2026-07-07",
        });

        await clickMode("Show Hold");
        await tasksEyePage.plugin("Technology Radar");
        await clickMode("Show Done");
        await tasksEyePage.plugin("No completed tasks for");

        const remembered = await unifiedViewState();
        if (remembered.mode !== "done" || remembered.date !== "2026-07-07") {
          throw new Error(`Done did not remember its date: ${JSON.stringify(remembered)}`);
        }

        await tasksEyePage.openDone(COMPLETED);
        const commandJump = await unifiedViewState();
        if (commandJump.date !== "2026-07-08") {
          throw new Error(`Done command did not jump to today: ${JSON.stringify(commandJump)}`);
        }
      },
    },
  ], screenshots: [
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
  ] },
);
