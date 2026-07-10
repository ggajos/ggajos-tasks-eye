import {
  expectElementNotText,
  expectElementText,
  openBoard,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "board",
    async run({ save }) {
      const root = await openBoard("hold", "Technology Radar");
      await expectElementText(
        root,
        "Evaluate Temporal for durable workflow orchestration",
      );
      await expectElementNotText(root, "Billing Platform Modernization");
      await save(root);
    },
  },
];
