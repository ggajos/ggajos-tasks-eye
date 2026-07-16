import { discoverFeatures } from "../../features/discovery";
import {
  VISUAL_VARIANTS,
  applyVisualVariant,
  assertEnglishObsidianLocale,
  beginVisualRun,
  checkFeatureDocSnapshot,
  discoverFeatureAcceptanceScenarios,
  discoverFeatureScreenshotScenarios,
  finishVisualRun,
  resetFixtureVault,
} from "../support/tasks-eye";

const SUITE = process.env.TASKS_EYE_SUITE ?? "acceptance";
const RUN_ACCEPTANCE = SUITE === "acceptance" || SUITE === "all";
const RUN_VISUAL = SUITE === "visual" || SUITE === "all";
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
    if (RUN_VISUAL) await beginVisualRun(FEATURE_SCREENSHOT_SCENARIOS);
  });

  after(async () => {
    if (RUN_VISUAL) await finishVisualRun();
  });

  if (RUN_ACCEPTANCE) {
    for (const { feature, scenario } of FEATURE_ACCEPTANCE_SCENARIOS) {
      it(`${feature.feature.title}: ${scenario.title}`, async () => {
        await resetFixtureVault(scenario.fixture);
        await applyVisualVariant(VISUAL_VARIANTS[0]!);
        await scenario.run();
      });
    }
  }

  if (RUN_VISUAL) {
    for (const { feature, scenario } of FEATURE_SCREENSHOT_SCENARIOS) {
      for (const variant of VISUAL_VARIANTS) {
        it(
          `documents ${feature.feature.title} ${scenario.screenshotSlug} in ${variant.label}`,
          async () => {
            await resetFixtureVault(scenario.fixture);
            await applyVisualVariant(variant);
            await scenario.run({
              save: (element) => checkFeatureDocSnapshot(
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
  }
});
