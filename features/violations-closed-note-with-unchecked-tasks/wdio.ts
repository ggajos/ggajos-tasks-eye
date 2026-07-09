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
      const root = await openBoard("inbox", "Closed With Open Task");
      await expectElementText(root, "closed note has unchecked tasks");
      await saveFeatureDocSnapshot(
        "violations-closed-note-with-unchecked-tasks",
        variant,
        "violation",
        root,
      );
    },
  },
];
