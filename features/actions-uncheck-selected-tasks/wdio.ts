import { browser } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";
import {
  UNCHECK_FILE,
  openUncheckFixture,
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
        return note.includes("- [ ] Approved the production readiness checklist") &&
          note.includes("- [ ] Validated rollback ownership with service leads") &&
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
    async run({ save }) {
      const editor = await openUncheckFixture();
      await save(editor);
    },
  },
  {
    screenshotSlug: "after",
    async run({ save }) {
      await openUncheckFixture();
      await uncheckSelectedTasks();
      const editor = await waitForActiveEditorText(
        "Approved the production readiness checklist",
      );
      await save(editor);
    },
  },
];
