import { expect } from "@wdio/globals";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const crowdedInbox = Array.from({ length: 40 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return note(`Archive/Imported Note ${number}.md`, {
    body: `Imported reference ${number} has no actionable tasks.`,
  });
});

export const { screenshotScenarios } = featureScenarios(
  fixture(crowdedInbox),
  { screenshots: [{
    screenshotSlug: "repair-queue",
    async run({ save }) {
      const root = await tasksEyePage.openBoard("inbox", "Imported Note 01");
      await expect(root).toHaveText(expect.stringContaining("Imported Note 40"));
      await save(root);
    },
  }] },
);
