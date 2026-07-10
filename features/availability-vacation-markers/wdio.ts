import {
  expectElementNotText,
  expectElementText,
  openBoard,
  setContextFilter,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "ooo-filter",
    async run({ save }) {
      await openBoard("open", "Approve the billing domain event contract");
      await setContextFilter("ooo");
      const root = await openBoard("open", "Vacation");
      await expectElementText(root, "OOO");
      await expectElementNotText(root, "Billing Platform Modernization");
      await save(root);
    },
  },
];
