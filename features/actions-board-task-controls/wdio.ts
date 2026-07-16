import { browser } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const FILE = "Mission/Platform/Billing Platform Modernization.md";
const ACTION = "Approve the billing domain event contract";

const boardFixture = fixture([note(FILE, {
    status: "open",
    tasks: [
      { text: ACTION, due: "2026-07-08" },
      { text: "Review the migration runbook", due: "2026-07-15" },
    ],
})]);

async function waitForFileText(text: string): Promise<void> {
  await browser.waitUntil(async () => (await obsidianPage.read(FILE)).includes(text), {
    timeout: 10_000,
    timeoutMsg: `Expected fixture to contain "${text}"`,
  });
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  boardFixture,
  { acceptance: [{
    title: "shifts task due dates through board controls",
    async run() {
      await tasksEyePage.openBoard("open", ACTION);
      await tasksEyePage.clickRowAction(ACTION, "Shift due date +1 day(s)");
      await waitForFileText(`${ACTION} 📅 2026-07-09`);
    },
  }, {
    title: "completes tasks through board controls and the Tasks API",
    async run() {
      await tasksEyePage.openBoard("open", ACTION);
      await tasksEyePage.clickRowAction(ACTION, "Complete task");
      await waitForFileText(`- [x] ${ACTION}`);
    },
  }], screenshots: [{
    screenshotSlug: "controls",
    async run({ save }) {
      const root = await tasksEyePage.openBoard("open", ACTION);
      await tasksEyePage.focusRowAction(ACTION, "Complete task");
      await save(root);
    },
  }] },
);
