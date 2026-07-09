import {
  expectElementText,
  openCompletedTasksView,
  saveFeatureDocSnapshot,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "done-view",
    async run(variant) {
      const root = await openCompletedTasksView();
      await expectElementText(root, "Completed Example");
      await saveFeatureDocSnapshot("views-done", variant, "done-view", root);
    },
  },
];
