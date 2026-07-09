import {
  expectElementNotText,
  expectElementText,
  openBoard,
  saveFeatureDocSnapshot,
  setContextFilter,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "ooo-filter",
    async run(variant) {
      await openBoard("open", "Confirm invoice import mapping");
      await setContextFilter("ooo");
      const root = await openBoard("open", "Vacation");
      await expectElementText(root, "OOO");
      await expectElementNotText(root, "Invoice Sync");
      await saveFeatureDocSnapshot(
        "availability-vacation-markers",
        variant,
        "ooo-filter",
        root,
      );
    },
  },
];
