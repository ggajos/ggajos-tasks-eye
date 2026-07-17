import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DOCUMENTED_COMMAND_GROUPS,
  formatCommandName,
  formatHotkey,
} from "../features/commands";
import type { DocumentedCommand } from "../features/commands";
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
const REFERENCE_CONTENT_ROOT = path.join(CONTENT_ROOT, "reference");
const GENERATED_ROOT = path.join(DOCS_SRC_ROOT, "src", "generated");
const TEMPLATE_ROOT = path.join(DOCS_SRC_ROOT, "templates");
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

interface SidebarFeatureLink {
  slug: string;
  label: string;
}

interface SidebarFeatureSection {
  label: string;
  items: readonly SidebarFeatureLink[];
}

const SIDEBAR_FEATURE_SECTIONS: readonly SidebarFeatureSection[] = [
  {
    label: "Everyday workflow",
    items: [
      { slug: "views-open", label: "Choose what to do next" },
      { slug: "actions-board-task-controls", label: "Complete or reschedule" },
      { slug: "filters-context-filtering", label: "Focus on a context" },
      { slug: "views-inbox", label: "Repair notes in Inbox" },
      { slug: "views-hold", label: "Pause work in Hold" },
      { slug: "views-done", label: "Review completed work" },
    ],
  },
  {
    label: "Notes in the workflow",
    items: [
      { slug: "actions-create-new-note", label: "Create a note" },
      { slug: "actions-step-note-status", label: "Step a note through states" },
      { slug: "data-vault-conventions", label: "Organize notes and tasks" },
    ],
  },
  {
    label: "Workflow checks",
    items: [
      {
        slug: "violations-open-note-without-due-date",
        label: "Add a dated next action",
      },
      {
        slug: "violations-open-note-without-uncompleted-tasks",
        label: "Add an unchecked task",
      },
      {
        slug: "violations-note-in-managed-root",
        label: "Move a note into context",
      },
      {
        slug: "violations-invalid-status",
        label: "Use a supported status",
      },
      {
        slug: "violations-closed-note-with-unchecked-tasks",
        label: "Resolve work in a closed note",
      },
      {
        slug: "violations-task-scheduled-on-vacation",
        label: "Move work off an unavailable day",
      },
    ],
  },
  {
    label: "More tools",
    items: [
      { slug: "availability-vacation-markers", label: "Plan around time away" },
      { slug: "actions-markdown-rendering", label: "Use Markdown in board tasks" },
      { slug: "actions-uncheck-selected-tasks", label: "Reopen completed tasks" },
    ],
  },
];

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

function featurePath(feature: LoadedFeatureDefinition): string {
  return `/features/${feature.slug}/`;
}

function screenshotAssetPath(
  feature: LoadedFeatureDefinition,
  screenshot: FeatureScreenshot,
  variantKey: string,
  prefix: string,
): string {
  return `${prefix}assets/features/${feature.slug}/${variantKey}/${screenshot.slug}.png`;
}

function renderCommandTable(
  features: readonly LoadedFeature[],
  featureLinkPrefix: string,
): string {
  const featureSlugs = new Set(features.map(({ feature }) => feature.slug));
  const renderRows = (commands: readonly DocumentedCommand[]) =>
    commands.map((command) => {
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
        ? `<a href="${featureLinkPrefix}features/${escapeHtml(command.featureSlug)}/">${escapeHtml(command.featureTitle)}</a>`
        : "&mdash;";

      return `<tr>
  <td>${shortcutCell}</td>
  <td><code>${escapeHtml(formatCommandName(command.name))}</code></td>
  <td>${featureCell}</td>
  <td>${escapeHtml(command.explanation)}</td>
</tr>`;
    })
    .join("\n");

  return DOCUMENTED_COMMAND_GROUPS.map((group) => `## ${escapeHtml(group.title)}

<p class="command-group-description">${escapeHtml(group.description)}</p>
<div class="command-group">
<div class="table-scroll">
<table class="shortcut-table">
  <thead>
    <tr>
      <th>Default shortcut</th>
      <th>Command</th>
      <th>Learn more</th>
      <th>Purpose</th>
    </tr>
  </thead>
  <tbody>
${renderRows(group.commands)}
  </tbody>
</table>
</div>
</div>`).join("\n\n");
}

async function renderTemplate(
  filename: string,
  replacements: Readonly<Record<string, string>> = {},
): Promise<string> {
  let template = await readFile(path.join(TEMPLATE_ROOT, filename), "utf8");
  for (const [token, value] of Object.entries(replacements)) {
    const marker = `{{${token}}}`;
    if (template.split(marker).length !== 2) {
      throw new Error(`${filename} must contain one ${marker}`);
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
## Example note to repair

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

## What to expect

${renderAcceptanceCriteria(feature.feature)}
${renderViolationSample(feature.feature)}
## What it looks like

${renderScreenshots(feature.feature)}
`;
}

function renderSidebar(features: readonly LoadedFeature[]): string {
  const featuresBySlug = new Map(
    features.map(({ feature }) => [feature.slug, feature]),
  );
  const linkedSlugs = new Set<string>();
  const featureSections = SIDEBAR_FEATURE_SECTIONS.map((section) => ({
    label: section.label,
    collapsed: true,
    items: section.items.map((item) => {
      const feature = featuresBySlug.get(item.slug);
      if (!feature) {
        throw new Error(`Sidebar references unknown feature ${item.slug}`);
      }
      if (linkedSlugs.has(item.slug)) {
        throw new Error(`Sidebar references feature ${item.slug} more than once`);
      }
      linkedSlugs.add(item.slug);
      return { label: item.label, link: featurePath(feature) };
    }),
  }));

  const unlinked = features
    .map(({ feature }) => feature.slug)
    .filter((slug) => !linkedSlugs.has(slug));
  if (unlinked.length > 0) {
    throw new Error(`Sidebar is missing features: ${unlinked.join(", ")}`);
  }

  const sidebar = [
    { label: "Overview", link: "/" },
    ...featureSections,
    {
      label: "Reference",
      collapsed: true,
      items: [
        { label: "Commands and shortcuts", link: "/reference/commands/" },
      ],
    },
  ];

  return `export const sidebar = ${JSON.stringify(sidebar, null, 2)};\n`;
}

async function build(): Promise<void> {
  const features = (await discoverFeatures()).sort(byGroupThenTitle);

  await mkdir(CONTENT_ROOT, { recursive: true });
  await mkdir(GENERATED_ROOT, { recursive: true });
  await rm(FEATURE_CONTENT_ROOT, { recursive: true, force: true });
  await rm(REFERENCE_CONTENT_ROOT, { recursive: true, force: true });
  await rm(path.join(CONTENT_ROOT, "testing.mdx"), { force: true });
  await mkdir(FEATURE_CONTENT_ROOT, { recursive: true });
  await mkdir(REFERENCE_CONTENT_ROOT, { recursive: true });

  await writeFile(
    path.join(CONTENT_ROOT, "index.mdx"),
    await renderTemplate("index.mdx"),
  );
  await writeFile(
    path.join(REFERENCE_CONTENT_ROOT, "commands.mdx"),
    await renderTemplate("commands.mdx", {
      COMMAND_TABLE: renderCommandTable(features, "../../"),
    }),
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
