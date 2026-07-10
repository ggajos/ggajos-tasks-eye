import { browser } from "@wdio/globals";
import { readFileSync } from "node:fs";
import { obsidianPage } from "wdio-obsidian-service";
import {
  OPEN_FILE,
  clickRowAction,
  expectRowAction,
  openBoard,
  type FeatureAcceptanceScenario,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

const ORIGINAL_OPEN_FILE = readFileSync(
  "acceptance/fixtures/base/Db/Mission/Platform/Billing Platform Modernization.md",
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
        await openBoard("open", "Approve the billing domain event contract");
        await clickRowAction(
          "Approve the billing domain event contract",
          "Shift due date +1 day(s)",
        );

        await browser.waitUntil(async () => {
          const note = await obsidianPage.read(OPEN_FILE);
          return note.includes(
            "Approve the billing domain event contract 📅 2026-07-09",
          );
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
        await openBoard("open", "Approve the billing domain event contract");
        await clickRowAction(
          "Approve the billing domain event contract",
          "Complete task",
        );

        await browser.waitUntil(async () => {
          const note = await obsidianPage.read(OPEN_FILE);
          return note.includes(
            "- [x] Approve the billing domain event contract",
          );
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
    async run({ save }) {
      const root = await openBoard(
        "open",
        "Approve the billing domain event contract",
      );
      await expectRowAction(
        "Approve the billing domain event contract",
        "Complete task",
      );
      await save(root);
    },
  },
];
