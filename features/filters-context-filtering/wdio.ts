import {
  expectElementNotText,
  expectElementText,
  openBoard,
  saveFeatureDocSnapshot,
  setContextFilter,
  waitForActivePluginText,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "filtered-board",
    async run(variant) {
      await openBoard("open", "Confirm invoice import mapping");
      await setContextFilter("m/allegro");
      const root = await waitForActivePluginText("Invoice Sync");
      await expectElementText(root, "M/Allegro");
      await expectElementNotText(root, "Passport Renewal");
      await saveFeatureDocSnapshot(
        "filters-context-filtering",
        variant,
        "filtered-board",
        root,
      );
    },
  },
];
