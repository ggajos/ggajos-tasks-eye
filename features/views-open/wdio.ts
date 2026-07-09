import {
  expectElementText,
  openBoard,
  saveFeatureDocSnapshot,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "board",
    async run(variant) {
      const root = await openBoard("open", "Confirm invoice import mapping");
      await expectElementText(root, "Vacation");
      await expectElementText(root, "Passport Renewal");
      await saveFeatureDocSnapshot("views-open", variant, "board", root);
    },
  },
];
