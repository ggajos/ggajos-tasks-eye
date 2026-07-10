import {
  expectElementText,
  openBoard,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "managed-note-row",
    async run({ save }) {
      const root = await openBoard("open", "Billing Platform Modernization");
      await expectElementText(root, "Approve the billing domain event contract");
      await save(root);
    },
  },
];
