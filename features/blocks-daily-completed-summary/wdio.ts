import {
  expectElementText,
  openDailyPreview,
  saveFeatureDocSnapshot,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "summary",
    async run(variant) {
      const preview = await openDailyPreview();
      await expectElementText(preview, "Completed Example");
      await saveFeatureDocSnapshot(
        "blocks-daily-completed-summary",
        variant,
        "summary",
        preview,
      );
    },
  },
];
