import {
  expectElementText,
  openDailyPreview,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "summary",
    async run({ save }) {
      const preview = await openDailyPreview();
      await expectElementText(preview, "Architecture Governance");
      await save(preview);
    },
  },
];
