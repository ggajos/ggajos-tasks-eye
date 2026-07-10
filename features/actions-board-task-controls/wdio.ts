import { browser } from "@wdio/globals";
import { readFileSync } from "node:fs";
import { obsidianPage } from "wdio-obsidian-service";
import {
  OPEN_FILE,
  clickRowAction,
  expectRowAction,
  openBoard,
  saveFeatureDocSnapshot,
  type FeatureAcceptanceScenario,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

const ORIGINAL_OPEN_FILE = readFileSync(
  "acceptance/fixtures/base/Db/Mission/Allegro/Invoice Sync.md",
  "utf8",
);

async function restoreOpenFixture(): Promise<void> {
  await obsidianPage.write(OPEN_FILE, ORIGINAL_OPEN_FILE);
}

export const acceptanceScenarios: readonly FeatureAcceptanceScenario[] = [
  {
    title: "shifts task due dates through board controls",
    async run() {
      try {
        await openBoard("open", "Confirm invoice import mapping");
        await clickRowAction(
          "Confirm invoice import mapping",
          "Shift due date +1 day(s)",
        );

        await browser.waitUntil(async () => {
          const note = await obsidianPage.read(OPEN_FILE);
          return note.includes("Confirm invoice import mapping 📅 2026-07-09");
        }, {
          timeout: 10_000,
          timeoutMsg: "Expected due date to shift to 2026-07-09",
        });
      } finally {
        await restoreOpenFixture();
      }
    },
  },
  {
    title: "completes tasks through board controls and the Tasks API",
    async run() {
      try {
        await openBoard("open", "Confirm invoice import mapping");
        await clickRowAction("Confirm invoice import mapping", "Complete task");

        await browser.waitUntil(async () => {
          const note = await obsidianPage.read(OPEN_FILE);
          return note.includes("- [x] Confirm invoice import mapping");
        }, {
          timeout: 10_000,
          timeoutMsg: "Expected first task to be completed",
        });
      } finally {
        await restoreOpenFixture();
      }
    },
  },
];

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "controls",
    async run(variant) {
      const root = await openBoard("open", "Confirm invoice import mapping");
      await expectRowAction(
        "Confirm invoice import mapping",
        "Complete task",
      );
      await saveFeatureDocSnapshot(
        "actions-board-task-controls",
        variant,
        "controls",
        root,
      );
    },
  },
];
