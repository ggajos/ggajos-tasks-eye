import {
  expectElementText,
  openBoard,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "repair-queue",
    async run({ save }) {
      const root = await openBoard("inbox", "Engineering Strategy Q3");
      await expectElementText(root, "Service Ownership Model");
      await expectElementText(root, "ADR-042 Tenant Isolation");
      await expectElementText(root, "Architecture Offsite");
      await save(root);
    },
  },
];
