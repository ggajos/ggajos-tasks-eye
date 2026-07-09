import {
  expectElementNotText,
  expectElementText,
  openBoard,
  saveFeatureDocSnapshot,
  type FeatureScreenshotScenario,
} from "../../acceptance/support/tasks-eye";

export const screenshotScenarios: readonly FeatureScreenshotScenario[] = [
  {
    screenshotSlug: "board",
    async run(variant) {
      const root = await openBoard("hold", "Reading Queue");
      await expectElementText(root, "Pick the next TypeScript testing article");
      await expectElementNotText(root, "Confirm invoice import mapping");
      await saveFeatureDocSnapshot("views-hold", variant, "board", root);
    },
  },
];
