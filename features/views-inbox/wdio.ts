import {
  expectElementText,
  openBoard,
  saveFeatureDocSnapshot,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "repair-queue",
    async run(variant) {
      const root = await openBoard("inbox", "Missing Task");
      await expectElementText(root, "Invalid Status");
      await expectElementText(root, "Closed With Open Task");
      await expectElementText(root, "Vacation Collision");
      await saveFeatureDocSnapshot("views-inbox", variant, "repair-queue", root);
    },
  },
];
