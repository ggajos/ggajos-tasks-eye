import {
  expectElementText,
  openCompletedTasksView,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "done-view",
    async run({ save }) {
      const root = await openCompletedTasksView();
      await expectElementText(root, "Architecture Governance");
      await save(root);
    },
  },
];
