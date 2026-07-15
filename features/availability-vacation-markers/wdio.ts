import { expect } from "@wdio/globals";
import { tasksEyePage } from "../../acceptance/support/tasks-eye-page";
import { featureScenarios } from "../../acceptance/support/tasks-eye";
import { fixture, note } from "../fixtures";

const WORK = "Prepare the availability review";

export const { screenshotScenarios } = featureScenarios(
  fixture([note("Planning/Availability Review.md", {
    status: "open",
    tasks: [{ text: WORK, due: "2026-07-20" }],
  })]),
  { screenshots: [{
    screenshotSlug: "ooo-filter",
    async run({ save }) {
      await tasksEyePage.openBoard("open", "Open");
      await tasksEyePage.setContextFilter("*");
      await tasksEyePage.expandBucketForText(WORK);
      await tasksEyePage.setContextFilter("ooo");
      const root = await tasksEyePage.plugin("Vacation");
      await expect(root).toHaveText(expect.stringContaining("OOO"));
      await expect(root).toHaveText(expect.not.stringContaining(WORK));
      await save(root);
    },
  }] },
);
