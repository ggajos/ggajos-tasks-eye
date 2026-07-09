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
      const root = await openBoard("inbox", "Missing Task");
      await expectElementText(root, "open note has no uncompleted tasks");
      await saveFeatureDocSnapshot(
        "violations-open-note-without-uncompleted-tasks",
        variant,
        "violation",
        root,
      );
    },
  },
];
