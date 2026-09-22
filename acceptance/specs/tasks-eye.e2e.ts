import { discoverFeaturesSync } from "../../scripts/feature-discovery";
import {
  applyVisualTheme,
  assertEnglishObsidianLocale,
  checkFeatureDocSnapshot,
  discoverFeatureAcceptanceScenarios,
  discoverFeatureScreenshotScenarios,
  pruneUnwrittenScreenshots,
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
let runFailed = false;

describe("Tasks Eye acceptance", () => {
  before(async () => {
    await assertEnglishObsidianLocale();
  });

  afterEach(function () {
    if (this.currentTest?.state === "failed") runFailed = true;
  });

  after(async () => {
    if (RUN_VISUAL && !runFailed) await pruneUnwrittenScreenshots();
  });

  if (RUN_ACCEPTANCE) {
    for (const { feature, scenario } of acceptanceScenarios) {
      it(`${feature.feature.title}: ${scenario.title}`, async () => {
        await resetFixtureVault(scenario.fixture);
        await applyVisualTheme();
        await scenario.run();
      });
    }
  }

  if (RUN_VISUAL) {
    for (const { feature, scenario } of screenshotScenarios) {
      it(
        `documents ${feature.feature.title} ${scenario.screenshotSlug}`,
        async () => {
          await resetFixtureVault(scenario.fixture);
          await applyVisualTheme();
          await scenario.run({
            save: (element, options) => checkFeatureDocSnapshot(
              feature.feature.slug,
              scenario.screenshotSlug,
              element,
              options,
            ),
          });
        },
      );
    }
  }
});
