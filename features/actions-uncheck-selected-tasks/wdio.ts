import { browser } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const FILE = "Db/Architecture/Release Readiness.md";
const FIRST_TASK = "Approved the production readiness checklist";

const uncheckFixture = fixture([note(FILE, {
    status: "closed",
    tasks: [
      { text: FIRST_TASK, completed: "2026-07-08" },
      { text: "Validated rollback ownership with service leads", completed: "2026-07-08" },
    ],
})]);

async function openSelection() {
  return await tasksEyePage.selectCheckedTasks(FILE, FIRST_TASK);
}

async function uncheckSelectedTasks(): Promise<void> {
  await browser.executeObsidianCommand("ggajos-tasks-eye:uncheck-selected-tasks");
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  uncheckFixture,
  { acceptance: [{
    title: "reopens selected completed tasks",
    async run() {
      await openSelection();
      await uncheckSelectedTasks();
      await browser.waitUntil(async () => {
        const markdown = await obsidianPage.read(FILE);
        return markdown.includes(`- [ ] ${FIRST_TASK}`) &&
          markdown.includes("- [ ] Validated rollback ownership with service leads") &&
          !markdown.includes("✅");
      }, {
        timeout: 10_000,
        timeoutMsg: "Expected selected completed tasks to be unchecked",
      });
    },
  }], screenshots: [{
    screenshotSlug: "before",
    async run({ save }) {
      await save(await openSelection());
    },
  }, {
    screenshotSlug: "after",
    async run({ save }) {
      await openSelection();
      await uncheckSelectedTasks();
      await save(await tasksEyePage.editor(FIRST_TASK));
    },
  }] },
);
