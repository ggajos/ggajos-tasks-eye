import { discoverFeaturesSync } from "../../scripts/feature-discovery";
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

// Obsidian runs specs in a CommonJS runtime that forbids top-level await, so
// feature discovery is performed synchronously here and the root suite is
// registered directly while the spec module is evaluated.
const features = discoverFeaturesSync();
const acceptanceScenarios = discoverFeatureAcceptanceScenarios(features);
const screenshotScenarios = discoverFeatureScreenshotScenarios(features);

describe("Tasks Eye acceptance", () => {
  before(async () => {
    await assertEnglishObsidianLocale();
    if (RUN_VISUAL) await beginVisualRun(screenshotScenarios);
  });

  after(async () => {
    if (RUN_VISUAL) await finishVisualRun();
  });

  if (RUN_ACCEPTANCE) {
    for (const { feature, scenario } of acceptanceScenarios) {
      it(`${feature.feature.title}: ${scenario.title}`, async () => {
        await resetFixtureVault(scenario.fixture);
        await applyVisualVariant(VISUAL_VARIANTS[0]!);
        await scenario.run();
      });
    }
  }

  if (RUN_VISUAL) {
    for (const { feature, scenario } of screenshotScenarios) {
      for (const variant of VISUAL_VARIANTS) {
        it(
          `documents ${feature.feature.title} ${scenario.screenshotSlug} in ${variant.label}`,
          async () => {
            await resetFixtureVault(scenario.fixture);
            await applyVisualVariant(variant);
            await scenario.run({
              save: (element, options) => checkFeatureDocSnapshot(
                feature.feature.slug,
                variant,
                scenario.screenshotSlug,
                element,
                options,
              ),
            });
          },
        );
      }
    }
  }
});
