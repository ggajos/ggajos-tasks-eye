import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DOCUMENTED_COMMANDS,
  formatCommandName,
  formatHotkey,
} from "../features/commands";
import { discoverFeatures } from "../features/discovery";
import { DOCUMENTATION_VARIANTS } from "../features/visualVariants";
import type {
  FeatureDefinition,
  FeatureScreenshot,
  LoadedFeature,
  LoadedFeatureDefinition,
} from "../features/types";

const DOCS_SRC_ROOT = path.resolve("docs-src");
const CONTENT_ROOT = path.join(DOCS_SRC_ROOT, "src", "content", "docs");
const FEATURE_CONTENT_ROOT = path.join(CONTENT_ROOT, "features");
const GENERATED_ROOT = path.join(DOCS_SRC_ROOT, "src", "generated");
const TEMPLATE_ROOT = path.join(DOCS_SRC_ROOT, "templates");
const DEFAULT_SCREENSHOT_VARIANT = "dark-minimal";
const SCREENSHOT_VARIANT_ORDER = ["dark-minimal", "dark", "light"];

const screenshotVariants = [...DOCUMENTATION_VARIANTS].sort((a, b) =>
  SCREENSHOT_VARIANT_ORDER.indexOf(a.key) -
  SCREENSHOT_VARIANT_ORDER.indexOf(b.key)
);

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
    label: "Workflow cleanup",
    description: "Validation issues shown in Inbox.",
    order: 70,
  },
};

const FALLBACK_GROUP: FeatureGroup = {
  label: "Other",
  description: "Feature folders without a shared prefix.",
  order: 999,
};

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

function groupForFeature(feature: LoadedFeatureDefinition): FeatureGroup {
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

function featurePath(feature: LoadedFeatureDefinition): string {
  return `/features/${feature.slug}/`;
}

function relativeFeaturePath(feature: LoadedFeatureDefinition): string {
  return `features/${feature.slug}/`;
}

function screenshotAssetPath(
  feature: LoadedFeatureDefinition,
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

function renderCommandTable(features: readonly LoadedFeature[]): string {
  const featureSlugs = new Set(features.map(({ feature }) => feature.slug));
  const rows = DOCUMENTED_COMMANDS
    .map((command) => {
      const shortcut = escapeHtml(formatHotkey(command.hotkey));
      const shortcutCell = command.hotkey
        ? `<kbd>${shortcut}</kbd>`
        : `<span class="shortcut-unassigned">${shortcut}</span>`;
      if ((command.featureSlug === undefined) !== (command.featureTitle === undefined)) {
        throw new Error(`Command ${command.id} must define both featureSlug and featureTitle`);
      }
      if (command.featureSlug && !featureSlugs.has(command.featureSlug)) {
        throw new Error(`Command ${command.id} references unknown feature ${command.featureSlug}`);
      }
      const featureCell = command.featureSlug && command.featureTitle
        ? `<a href="features/${escapeHtml(command.featureSlug)}/">${escapeHtml(command.featureTitle)}</a>`
        : "&mdash;";

      return `<tr>
  <td>${shortcutCell}</td>
  <td><code>${escapeHtml(formatCommandName(command.name))}</code></td>
  <td>${featureCell}</td>
  <td>${escapeHtml(command.explanation)}</td>
</tr>`;
    })
    .join("\n");

  return `<div class="table-scroll">
<table class="shortcut-table">
  <thead>
    <tr>
      <th>Default shortcut</th>
      <th>Command</th>
      <th>Feature</th>
      <th>Purpose</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>
</div>`;
}

async function renderIndexPage(features: readonly LoadedFeature[]): Promise<string> {
  let template = await readFile(path.join(TEMPLATE_ROOT, "index.mdx"), "utf8");
  const replacements = {
    FEATURE_CARDS: renderIndexFeatureCards(features),
    COMMAND_TABLE: renderCommandTable(features),
  };
  for (const [token, value] of Object.entries(replacements)) {
    const marker = `{{${token}}}`;
    if (template.split(marker).length !== 2) {
      throw new Error(`Documentation template must contain one ${marker}`);
    }
    template = template.replace(marker, value);
  }
  return template;
}

function renderAcceptanceCriteria(feature: FeatureDefinition): string {
  return feature.acceptanceCriteria
    .map((criterion) => `- ${criterion}`)
    .join("\n");
}

function renderViolationSample(feature: FeatureDefinition): string {
  const violation = feature.violation;
  if (!violation) return "";
  const sample = violation.fixture.subject;

  return `
## Example note that needs attention

\`\`\`md
${sample.markdown.trimEnd()}
\`\`\`
`;
}

function withoutLeadingHeading(markdown: string): string {
  return markdown.replace(/^#{1,6}\s+[^\n]+\n+/, "").trim();
}

function renderScreenshots(feature: LoadedFeatureDefinition): string {
  return feature.screenshots
    .map((screenshot) => {
      const tabs = screenshotVariants
        .map((variant) => {
          const src = screenshotAssetPath(
            feature,
            screenshot,
            variant.key,
            "../../",
          );
          const alt = `${screenshot.alt} in ${variant.label}`;
          return `<TabItem label="${escapeHtml(variant.label)}">
  <figure class="feature-shot">
    <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />
    <figcaption>${escapeHtml(screenshot.title)} · ${escapeHtml(variant.label)}</figcaption>
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

## Why it matters

${withoutLeadingHeading(feature.whyMarkdown.trim())}

## Rules

${renderAcceptanceCriteria(feature.feature)}
${renderViolationSample(feature.feature)}
## Preview

${renderScreenshots(feature.feature)}
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
  ];

  return `export const sidebar = ${JSON.stringify(sidebar, null, 2)};\n`;
}

async function build(): Promise<void> {
  const features = (await discoverFeatures()).sort(byGroupThenTitle);

  await mkdir(CONTENT_ROOT, { recursive: true });
  await mkdir(GENERATED_ROOT, { recursive: true });
  await rm(FEATURE_CONTENT_ROOT, { recursive: true, force: true });
  await rm(path.join(CONTENT_ROOT, "testing.mdx"), { force: true });
  await mkdir(FEATURE_CONTENT_ROOT, { recursive: true });

  await writeFile(
    path.join(CONTENT_ROOT, "index.mdx"),
    await renderIndexPage(features),
  );
  await writeFile(path.join(GENERATED_ROOT, "sidebar.mjs"), renderSidebar(features));

  for (const [index, feature] of features.entries()) {
    await writeFile(
      path.join(FEATURE_CONTENT_ROOT, `${feature.feature.slug}.mdx`),
      renderFeaturePage(feature, index + 1),
    );
  }
}

await build();
