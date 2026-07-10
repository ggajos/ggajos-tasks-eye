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
        "Review ADR-042 with Security Architecture",
      );
      await expectElementNotText(root, "Billing Platform Modernization");
      await save(root);
    },
  },
];
