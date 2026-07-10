import {
  expectElementText,
  openBoard,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "board",
    async run({ save }) {
      const root = await openBoard("open", "Approve the billing domain event contract");
      await expectElementText(root, "Vacation");
      await expectElementText(root, "Staff Engineering Mentorship");
      await save(root);
    },
  },
];
