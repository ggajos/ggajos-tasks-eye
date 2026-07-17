import { browser } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { fixture, note } from "../fixtures";

const FILE = "Work/Client Website Refresh.md";
const ACTION = "Send the revised homepage copy to Marta";

const boardFixture = fixture([
  note(FILE, {
    status: "open",
    tasks: [
      { text: ACTION, due: "2026-07-08" },
      { text: "Review the launch checklist", due: "2026-07-15" },
    ],
  }),
  note("Home/Kitchen Renovation.md", {
    status: "open",
    tasks: [
      {
        text: "Call the electrician about the updated quote",
        due: "2026-07-08",
      },
    ],
  }),
  note("Family/Summer Trip.md", {
    status: "open",
    tasks: [{ text: "Book train tickets to Gdańsk", due: "2026-07-08" }],
  }),
]);

async function waitForFileText(text: string): Promise<void> {
  await browser.waitUntil(
    async () => (await obsidianPage.read(FILE)).includes(text),
    {
      timeout: 10_000,
      timeoutMsg: `Expected fixture to contain "${text}"`,
    },
  );
}

export const { acceptanceScenarios, screenshotScenarios } = featureScenarios(
  boardFixture,
  {
    acceptance: [
      {
        title: "shifts task due dates through board controls",
        async run() {
          await tasksEyePage.openBoard("open", ACTION);
          await tasksEyePage.clickRowAction(
            ACTION,
            "Move due date 1 day later",
          );
          await waitForFileText(`${ACTION} 📅 2026-07-09`);
        },
      },
      {
        title: "completes tasks through board controls and the Tasks API",
        async run() {
          await tasksEyePage.openBoard("open", ACTION);
          await tasksEyePage.clickRowAction(ACTION, "Mark task done");
          await waitForFileText(`- [x] ${ACTION}`);
        },
      },
    ],
    screenshots: [
      {
        screenshotSlug: "controls",
        async run({ save }) {
          const root = await tasksEyePage.openBoard("open", ACTION);
          await tasksEyePage.focusRowAction(ACTION, "Mark task done");
          await save(root);
        },
      },
    ],
  },
);
