import { discoverFeatures } from "../../features/discovery";
import {
  VISUAL_VARIANTS,
  applyVisualVariant,
  discoverFeatureAcceptanceScenarios,
  discoverFeatureScreenshotScenarios,
  resetDocSnapshotRoot,
  resetFixtureVault,
} from "../support/tasks-eye";

const FEATURES = await discoverFeatures();
const FEATURE_ACCEPTANCE_SCENARIOS = await discoverFeatureAcceptanceScenarios(
  FEATURES,
);
const FEATURE_SCREENSHOT_SCENARIOS = await discoverFeatureScreenshotScenarios(
  FEATURES,
);

describe("Tasks Eye acceptance", () => {
  before(async () => {
    await resetDocSnapshotRoot(FEATURE_SCREENSHOT_SCENARIOS);
  });

  for (const { feature, scenario } of FEATURE_ACCEPTANCE_SCENARIOS) {
    it(`${feature.feature.title}: ${scenario.title}`, async () => {
      await resetFixtureVault();
      await applyVisualVariant(VISUAL_VARIANTS[0]!);
      await scenario.run();
    });
  }

  for (const { feature, scenario } of FEATURE_SCREENSHOT_SCENARIOS) {
    for (const variant of VISUAL_VARIANTS) {
      it(
        `documents ${feature.feature.title} ${scenario.screenshotSlug} in ${variant.label}`,
        async () => {
          await resetFixtureVault();
          await applyVisualVariant(variant);
          await scenario.run(variant);
        },
      );
    }
  }
});
