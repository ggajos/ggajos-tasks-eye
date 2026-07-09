import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { COMMAND_SHORTCUTS, formatHotkey } from "../features/commands";
import { discoverFeatures } from "../features/discovery";
import { DOCUMENTATION_VARIANTS } from "../features/visualVariants";
import type {
  FeatureDefinition,
  FeatureScreenshot,
  LoadedFeature,
} from "../features/types";

const DOCS_SRC_ROOT = path.resolve("docs-src");
const CONTENT_ROOT = path.join(DOCS_SRC_ROOT, "src", "content", "docs");
const FEATURE_CONTENT_ROOT = path.join(CONTENT_ROOT, "features");
const GENERATED_ROOT = path.join(DOCS_SRC_ROOT, "src", "generated");
const DEFAULT_SCREENSHOT_VARIANT = "dark-minimal";
const SCREENSHOT_VARIANT_ORDER = ["dark-minimal", "dark", "light"];

interface FeatureGroup {
  label: string;
  description: string;
  order: number;
}

const FEATURE_GROUPS: Record<string, FeatureGroup> = {
  actions: {
    label: "Actions",
    description: "Editor and board commands that change task state.",
    order: 10,
  },
  availability: {
    label: "Availability",
    description: "Calendar context that changes how work is interpreted.",
    order: 20,
  },
  blocks: {
    label: "Blocks",
    description: "Markdown code blocks rendered inside notes.",
    order: 30,
  },
  data: {
    label: "Data",
    description: "Vault conventions and metadata contracts.",
    order: 40,
  },
  filters: {
    label: "Filters",
    description: "Controls that narrow visible work without changing notes.",
    order: 50,
  },
  views: {
    label: "Views",
    description: "Primary task boards and review surfaces.",
    order: 60,
  },
  violations: {
    label: "Violations",
    description: "One feature per validation rule shown in Inbox.",
    order: 70,
  },
};

const FALLBACK_GROUP: FeatureGroup = {
  label: "Other",
  description: "Feature folders without a shared prefix.",
  order: 999,
};

const screenshotVariants = [...DOCUMENTATION_VARIANTS].sort((a, b) =>
  SCREENSHOT_VARIANT_ORDER.indexOf(a.key) - SCREENSHOT_VARIANT_ORDER.indexOf(b.key)
);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function singleLine(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

function slugPrefix(slug: string): string {
  return slug.split("-")[0] ?? slug;
}

function groupForFeature(feature: FeatureDefinition): FeatureGroup {
  return FEATURE_GROUPS[slugPrefix(feature.slug)] ?? FALLBACK_GROUP;
}

function byGroupThenTitle(a: LoadedFeature, b: LoadedFeature): number {
  const groupA = groupForFeature(a.feature);
  const groupB = groupForFeature(b.feature);
  return (
    groupA.order - groupB.order ||
    a.feature.title.localeCompare(b.feature.title)
  );
}

function groupFeatures(features: readonly LoadedFeature[]): Map<string, LoadedFeature[]> {
  const grouped = new Map<string, { group: FeatureGroup; features: LoadedFeature[] }>();
  for (const feature of features) {
    const group = groupForFeature(feature.feature);
    const entry = grouped.get(group.label) ?? { group, features: [] };
    entry.features.push(feature);
    grouped.set(group.label, entry);
  }

  return new Map(
    [...grouped.entries()]
      .sort(([, entryA], [, entryB]) => entryA.group.order - entryB.group.order)
      .map(([label, entry]) => [label, entry.features]),
  );
}

function featurePath(feature: FeatureDefinition): string {
  return `/features/${feature.slug}/`;
}

function relativeFeaturePath(feature: FeatureDefinition): string {
  return `features/${feature.slug}/`;
}

function screenshotAssetPath(
  feature: FeatureDefinition,
  screenshot: FeatureScreenshot,
  variantKey: string,
  prefix: string,
): string {
  return `${prefix}assets/features/${feature.slug}/${variantKey}/${screenshot.slug}.png`;
}

function renderIndexFeatureCards(features: readonly LoadedFeature[]): string {
  return [...groupFeatures(features)]
    .map(([label, groupFeaturesForLabel]) => {
      const group = groupForFeature(groupFeaturesForLabel[0]!.feature);
      const cards = groupFeaturesForLabel
        .sort(byGroupThenTitle)
        .map(({ feature }) => {
          const shot = feature.screenshots[0]!;
          const src = screenshotAssetPath(feature, shot, DEFAULT_SCREENSHOT_VARIANT, "");
          return `<article class="feature-card">
  <a href="${relativeFeaturePath(feature)}" class="feature-card__media" aria-label="${escapeHtml(feature.title)} documentation">
    <img src="${escapeHtml(src)}" alt="${escapeHtml(shot.alt)}" loading="lazy" />
  </a>
  <div class="feature-card__body">
    <h3><a href="${relativeFeaturePath(feature)}">${escapeHtml(feature.title)}</a></h3>
    <p>${escapeHtml(singleLine(feature.summary))}</p>
    <p class="feature-card__value">${escapeHtml(singleLine(feature.userValue))}</p>
  </div>
</article>`;
        })
        .join("\n");

      return `<section class="feature-group" aria-labelledby="feature-group-${slugPrefix(groupFeaturesForLabel[0]!.feature.slug)}">
  <div class="feature-group__heading">
    <h3 id="feature-group-${slugPrefix(groupFeaturesForLabel[0]!.feature.slug)}">${escapeHtml(label)}</h3>
    <p>${escapeHtml(group.description)}</p>
  </div>
  <div class="feature-grid">
${cards}
  </div>
</section>`;
    })
    .join("\n\n");
}

function renderShortcutTable(features: readonly LoadedFeature[]): string {
  const featureSlugs = new Set(features.map(({ feature }) => feature.slug));
  const rows = COMMAND_SHORTCUTS
    .filter((command) => featureSlugs.has(command.featureSlug))
    .map((command) => `<tr>
  <td><kbd>${escapeHtml(formatHotkey(command.hotkey))}</kbd></td>
  <td><code>${escapeHtml(command.commandName)}</code></td>
  <td><a href="features/${escapeHtml(command.featureSlug)}/">${escapeHtml(command.featureTitle)}</a></td>
  <td>${escapeHtml(command.explanation)}</td>
</tr>`)
    .join("\n");

  return `<div class="table-scroll">
<table class="shortcut-table">
  <thead>
    <tr>
      <th>Default shortcut</th>
      <th>Command</th>
      <th>Feature</th>
      <th>Why</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>
</div>`;
}

function renderIndexPage(features: readonly LoadedFeature[]): string {
  return `---
title: "Tasks Eye"
description: "Native Obsidian task views for Tasks-driven vaults."
sidebar:
  label: "Overview"
  order: 0
---

Tasks Eye is an Obsidian plugin for note-centered task boards, repair queues,
review views, editor commands, and daily summaries. The documentation is
generated from feature folders, so each page is backed by rationale, executable
tests, and WDIO screenshots.

## Workflow

<ol class="workflow-list">
  <li><strong>Open</strong><span>Review actionable notes grouped by due date.</span></li>
  <li><strong>Inbox</strong><span>Fix one validation rule at a time.</span></li>
  <li><strong>Hold</strong><span>Keep backlog notes visible outside today's work.</span></li>
  <li><strong>Done</strong><span>Review completed tasks by selected date.</span></li>
</ol>

## Feature Index

Each entry below comes from a folder under <code>features/</code>. Prefixes group
related behavior, including <code>actions-*</code>, <code>views-*</code>, and
<code>violations-*</code>.

${renderIndexFeatureCards(features)}

## Keyboard Shortcuts

These defaults are registered by the plugin and can still be changed in
Obsidian's hotkey settings. Each shortcut links to the feature that owns the
behavior.

${renderShortcutTable(features)}

## Documentation Pipeline

Feature folders feed the unit suite, the WDIO acceptance runner, and this
Starlight site.

\`\`\`bash
npm test
npm run acceptance:test
npm run docs:screenshots
\`\`\`
`;
}

function renderAcceptanceCriteria(feature: FeatureDefinition): string {
  return feature.acceptanceCriteria
    .map((criterion) => `- ${criterion}`)
    .join("\n");
}

function renderFixtures(feature: FeatureDefinition): string {
  if (feature.fixturePaths.length === 0) return "";

  return `## Fixtures

${feature.fixturePaths.map((fixture) => `- \`${fixture}\``).join("\n")}
`;
}

function demoteHeadings(markdown: string): string {
  return markdown.replaceAll(/^(#{1,5})(\s+)/gm, "#$1$2");
}

function renderScreenshotTabs(feature: FeatureDefinition): string {
  return feature.screenshots
    .map((screenshot) => {
      const tabs = screenshotVariants
        .map((variant) => {
          const src = screenshotAssetPath(feature, screenshot, variant.key, "../../");
          const alt = `${screenshot.alt} in ${variant.label}`;
          return `<TabItem label="${escapeHtml(variant.label)}">
  <figure class="feature-shot">
    <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />
    <figcaption>${escapeHtml(screenshot.title)} - ${escapeHtml(variant.label)}</figcaption>
  </figure>
</TabItem>`;
        })
        .join("\n");

      return `### ${screenshot.title}

<Tabs syncKey="feature-screenshot-theme">
${tabs}
</Tabs>`;
    })
    .join("\n\n");
}

function renderFeaturePage(feature: LoadedFeature, order: number): string {
  return `---
title: ${yamlString(feature.feature.title)}
description: ${yamlString(singleLine(feature.feature.summary))}
sidebar:
  label: ${yamlString(feature.feature.title)}
  order: ${order}
---

import { Tabs, TabItem } from '@astrojs/starlight/components';

${feature.feature.summary}

## Rationale

${demoteHeadings(feature.whyMarkdown.trim())}

## User Value

${feature.feature.userValue}

## Executable Documentation

${renderAcceptanceCriteria(feature.feature)}

## Screenshots

Screenshots are captured by WDIO in Obsidian Light, Obsidian Dark, and Dark with
the Minimal theme. Dark Minimal is shown first by default; use the tabs to switch
variants in the browser.

${renderScreenshotTabs(feature.feature)}

${renderFixtures(feature.feature)}
`;
}

function renderTestingPage(): string {
  return `---
title: "Acceptance Testing"
description: "How Tasks Eye runs feature-owned acceptance tests and documentation screenshots."
sidebar:
  label: "Acceptance testing"
  order: 100
---

Tasks Eye acceptance tests run the real Obsidian desktop app against a generated
fixture vault. The harness uses \`wdio-obsidian-service\` to download and sandbox
Obsidian, install the Tasks community plugin, and install the local Tasks Eye
build.

## Architecture

- \`wdio.conf.mts\` defines Obsidian versions, plugin installation, vault copying, and the WDIO service.
- \`acceptance/fixtures/base/\` contains markdown notes copied into each fresh vault.
- \`acceptance/specs/\` contains the WebdriverIO runner that discovers feature acceptance and screenshot scenarios.
- \`acceptance/snapshots/docs/features/\` stores review screenshots from the last run, grouped by feature and visual variant.
- \`features/<slug>/\` contains feature-owned metadata, rationale, unit tests, and optional WDIO screenshot scenarios.
- \`docs-src/\` contains the Starlight source project and generated content pages.
- \`.obsidian-cache/\` stores downloaded Obsidian, driver, and community plugin assets.
- \`docs-src/public/assets/features/\` stores screenshots consumed by the generated documentation site.

The default target is:

- Obsidian \`latest/latest\` (\`appVersion/installerVersion\`)
- Tasks plugin \`latest\`
- Minimal theme \`latest\`
- acceptance date \`2026-07-08\`

Override them with environment variables when needed:

\`\`\`bash
OBSIDIAN_VERSIONS="1.12.7/latest" TASKS_PLUGIN_VERSION=8.2.2 npm run acceptance:test
\`\`\`

## Commands

Use Node \`22.12.0\` or newer for acceptance testing. The WDIO/Obsidian launcher
stack uses modern Node APIs that fail on older Node 20 builds.

\`\`\`bash
npm run acceptance:test
npm run acceptance:update-snapshots
npm run docs:screenshots
npm run docs:build
npm run docs:serve
\`\`\`

For GitHub Pages, use repository settings and select "Deploy from branch" with
the \`/docs\` folder. This repository intentionally has no GitHub Actions
workflow.

## Review Workflow

1. Run \`npm test\` and \`npm run build\`.
2. Run \`npm run acceptance:test\`.
3. Review \`acceptance/snapshots/docs/features/\` for UI changes across Light, Dark, and Dark Minimal variants.
4. If a visual change is intended, run \`npm run acceptance:update-snapshots\`.
5. Run \`npm run docs:screenshots\` when documentation screenshots should change.
6. Run \`npm run docs:build\` after changing \`docs-src/\` or feature metadata.
7. Review \`acceptance/snapshots/\`, \`docs-src/public/assets/features/\`, and generated \`docs/features/\` pages before commit.

## Notes

- The plugin reads \`TASKS_EYE_TODAY\` only to make screenshots deterministic in acceptance runs. Normal Obsidian usage falls back to the real local date.
- The fixture vault is copied by the service, so tests do not mutate the source markdown under \`acceptance/fixtures/base/\`.
- Pin \`OBSIDIAN_VERSIONS\` in CI or release branches when screenshot diffs must stay reproducible across time.
`;
}

function renderSidebar(features: readonly LoadedFeature[]): string {
  const featureGroups = [...groupFeatures(features)]
    .map(([label, groupFeaturesForLabel]) => {
      const items = groupFeaturesForLabel
        .sort(byGroupThenTitle)
        .map(({ feature }) => ({
          label: feature.title,
          link: featurePath(feature),
        }));

      return {
        label,
        collapsed: false,
        items,
      };
    });

  const sidebar = [
    { label: "Overview", link: "/" },
    {
      label: "Features",
      collapsed: false,
      items: featureGroups,
    },
    {
      label: "Reference",
      collapsed: false,
      items: [{ label: "Acceptance testing", link: "/testing/" }],
    },
  ];

  return `export const sidebar = ${JSON.stringify(sidebar, null, 2)};\n`;
}

async function build(): Promise<void> {
  const features = (await discoverFeatures()).sort(byGroupThenTitle);

  await mkdir(CONTENT_ROOT, { recursive: true });
  await mkdir(GENERATED_ROOT, { recursive: true });
  await rm(FEATURE_CONTENT_ROOT, { recursive: true, force: true });
  await mkdir(FEATURE_CONTENT_ROOT, { recursive: true });

  await writeFile(path.join(CONTENT_ROOT, "index.mdx"), renderIndexPage(features));
  await writeFile(path.join(CONTENT_ROOT, "testing.mdx"), renderTestingPage());
  await writeFile(path.join(GENERATED_ROOT, "sidebar.mjs"), renderSidebar(features));

  for (const [index, feature] of features.entries()) {
    await writeFile(
      path.join(FEATURE_CONTENT_ROOT, `${feature.feature.slug}.mdx`),
      renderFeaturePage(feature, index + 1),
    );
  }
}

await build();
