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
      const root = await openBoard("inbox", "Vacation Collision");
      await expectElementText(root, "task scheduled on vacation");
      await saveFeatureDocSnapshot(
        "violations-task-scheduled-on-vacation",
        variant,
        "violation",
        root,
      );
    },
  },
];
