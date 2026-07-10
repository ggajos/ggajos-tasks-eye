import {
  expectElementNotText,
  expectElementText,
  openBoard,
  setContextFilter,
  waitForActivePluginText,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "filtered-board",
    async run({ save }) {
      await openBoard("open", "Approve the billing domain event contract");
      await setContextFilter("m/platform");
      const root = await waitForActivePluginText("Billing Platform Modernization");
      await expectElementText(root, "M/Platform");
      await expectElementNotText(root, "Staff Engineering Mentorship");
      await save(root);
    },
  },
];
