import {
  expectElementText,
  openBoard,
  saveFeatureDocSnapshot,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "violation",
    async run(variant) {
      const root = await openBoard("inbox", "Invalid Status");
      await expectElementText(root, 'invalid status: "waiting"');
      await saveFeatureDocSnapshot(
        "violations-invalid-status",
        variant,
        "violation",
        root,
      );
    },
  },
];
