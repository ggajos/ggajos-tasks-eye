import { discoverFeatures } from "../../features/discovery";
import {
  VISUAL_VARIANTS,
  applyVisualVariant,
  assertEnglishObsidianLocale,
  discoverFeatureAcceptanceScenarios,
  discoverFeatureScreenshotScenarios,
  resetDocSnapshotRoot,
  resetFixtureVault,
  saveFeatureDocSnapshot,
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
    await assertEnglishObsidianLocale();
    await resetDocSnapshotRoot(FEATURE_SCREENSHOT_SCENARIOS);
  });

  for (const { feature, scenario } of FEATURE_ACCEPTANCE_SCENARIOS) {
    it(`${feature.feature.title}: ${scenario.title}`, async () => {
      await resetFixtureVault(scenario.fixture);
      await applyVisualVariant(VISUAL_VARIANTS[0]!);
      await scenario.run();
    });
  }

  for (const { feature, scenario } of FEATURE_SCREENSHOT_SCENARIOS) {
    for (const variant of VISUAL_VARIANTS) {
      it(
        `documents ${feature.feature.title} ${scenario.screenshotSlug} in ${variant.label}`,
        async () => {
          await resetFixtureVault(scenario.fixture);
          await applyVisualVariant(variant);
          await scenario.run({
            save: (element) => saveFeatureDocSnapshot(
              feature.feature.slug,
              variant,
              scenario.screenshotSlug,
              element,
            ),
          });
        },
      );
    }
  }
});
