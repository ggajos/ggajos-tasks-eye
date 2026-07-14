import { browser } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";
import {
  expectElementText,
  openBoard,
  openDoneMode,
  waitForActivePluginText,
  type FeatureAcceptanceScenario,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

const VIEW_TYPE = "ggajos-tasks-eye-view";
const LEGACY_COMPLETED_VIEW_TYPE = "ggajos-tasks-eye-completed-view";

async function unifiedViewState(): Promise<{
  date: unknown;
  doneRibbonCount: number;
  eyeRibbonCount: number;
  icon: string | null;
  legacyLeafCount: number;
  mode: unknown;
  title: string | null;
  unifiedLeafCount: number;
}> {
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

export const acceptanceScenarios: readonly FeatureAcceptanceScenario[] = [
  {
    title: "uses one native view for work and completed tasks",
    async run() {
      await openBoard("open", "Approve the billing domain event contract");
      await openDoneMode();

      const state = await unifiedViewState();
      if (
        state.unifiedLeafCount !== 1 ||
        state.legacyLeafCount !== 0 ||
        state.mode !== "done" ||
        state.date !== "2026-07-08" ||
        state.icon !== "eye" ||
        state.title !== "Tasks Eye: Done: 2026-07-08" ||
        state.eyeRibbonCount !== 1 ||
        state.doneRibbonCount !== 0
      ) {
        throw new Error(
          `Unexpected unified Done state: ${JSON.stringify(state)}`,
        );
      }
    },
  },
  {
    title: "remembers tab dates and keeps command and daily-note jumps",
    async run() {
      await openDoneMode();
      await browser.execute(() => {
        const input = document.querySelector<HTMLInputElement>(
          '.workspace-leaf.mod-active input[aria-label="Done date"]',
        );
        if (!input) throw new Error("Done date input is missing");
        input.value = "2026-07-07";
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });

      await browser.waitUntil(async () =>
        (await unifiedViewState()).date === "2026-07-07", {
        timeout: 10_000,
        timeoutMsg: "Expected Done to select 2026-07-07",
      });

      await browser.execute(() => {
        const button = document.querySelector<HTMLButtonElement>(
          '.workspace-leaf.mod-active button[aria-label="Show Hold"]',
        );
        if (!button) throw new Error("Hold mode button is missing");
        button.click();
      });
      await waitForActivePluginText("Technology Radar");

      await browser.execute(() => {
        const button = document.querySelector<HTMLButtonElement>(
          '.workspace-leaf.mod-active button[aria-label="Show Done"]',
        );
        if (!button) throw new Error("Done mode button is missing");
        button.click();
      });
      await waitForActivePluginText("No completed tasks for");

      const remembered = await unifiedViewState();
      if (remembered.mode !== "done" || remembered.date !== "2026-07-07") {
        throw new Error(
          `Done did not remember its date: ${JSON.stringify(remembered)}`,
        );
      }

      await openDoneMode();
      const commandJump = await unifiedViewState();
      if (commandJump.date !== "2026-07-08") {
        throw new Error(
          `Done command did not jump to today: ${JSON.stringify(commandJump)}`,
        );
      }

      const dailyPath = "Timeline/2026/2026-07-09 - Thu.md";
      await obsidianPage.write(dailyPath, "# Thursday\n");
      await browser.executeObsidian(async ({ app, obsidian }, filePath) => {
        const file = app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof obsidian.TFile)) {
          throw new Error(`Daily note not found: ${filePath}`);
        }
        await app.workspace.getLeaf(true).openFile(file);
      }, dailyPath);

      await browser.waitUntil(async () =>
        (await unifiedViewState()).date === "2026-07-09", {
        timeout: 10_000,
        timeoutMsg: "Expected active daily note to synchronize the Done date",
      });

      await browser.executeObsidian(({ app }, filePath) => {
        for (const leaf of app.workspace.getLeavesOfType("markdown")) {
          if (leaf.getViewState().state?.file === filePath) leaf.detach();
        }
      }, dailyPath);
    },
  },
];

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "done-view",
    async run({ save }) {
      const root = await openDoneMode();
      await expectElementText(root, "Architecture Governance");
      await save(root);
    },
  },
];
