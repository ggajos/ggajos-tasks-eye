import { browser } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";
import {
  UNCHECK_FILE,
  openUncheckFixture,
  saveFeatureDocSnapshot,
  waitForActiveEditorText,
  type FeatureAcceptanceScenario,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

async function uncheckSelectedTasks(): Promise<void> {
  await browser.executeObsidianCommand(
    "ggajos-tasks-eye:uncheck-selected-tasks",
  );
}

export const acceptanceScenarios: readonly FeatureAcceptanceScenario[] = [
  {
    title: "reopens selected completed tasks",
    async run() {
      await openUncheckFixture();
      await uncheckSelectedTasks();
      await browser.waitUntil(async () => {
        const note = await obsidianPage.read(UNCHECK_FILE);
        return note.includes("- [ ] Reopen follow-up checklist") &&
          note.includes("- [ ] Return recurring reading task") &&
          !note.includes("✅");
      }, {
        timeout: 10_000,
        timeoutMsg: "Expected selected completed tasks to be unchecked",
      });
    },
  },
];

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "before",
    async run(variant) {
      const editor = await openUncheckFixture();
      await saveFeatureDocSnapshot(
        "actions-uncheck-selected-tasks",
        variant,
        "before",
        editor,
      );
    },
  },
  {
    screenshotSlug: "after",
    async run(variant) {
      await openUncheckFixture();
      await uncheckSelectedTasks();
      const editor = await waitForActiveEditorText("Reopen follow-up checklist");
      await saveFeatureDocSnapshot(
        "actions-uncheck-selected-tasks",
        variant,
        "after",
        editor,
      );
    },
  },
];
