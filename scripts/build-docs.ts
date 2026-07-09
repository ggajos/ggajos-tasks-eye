import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { COMMAND_SHORTCUTS, formatHotkey } from "../features/commands";
import { discoverFeatures } from "../features/discovery";
import { DOCUMENTATION_VARIANTS } from "../features/visualVariants";
import type { FeatureDefinition, LoadedFeature } from "../features/types";

const DOCS_ROOT = path.resolve("docs");
const DOCS_SRC_ROOT = path.resolve("docs-src");

function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

function renderInline(markdown: string): string {
  return marked.parseInline(markdown, { async: false }) as string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pageShell(
  title: string,
  description: string,
  body: string,
  rootPrefix = "",
): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="stylesheet" href="${rootPrefix}styles.css">
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="${rootPrefix}index.html#top">Tasks Eye</a>
      <nav aria-label="Documentation">
        <a href="${rootPrefix}index.html#features">Features</a>
        <a href="${rootPrefix}index.html#feature-docs">Index</a>
        <a href="${rootPrefix}index.html#shortcuts">Shortcuts</a>
        <a href="${rootPrefix}index.html#testing">Testing</a>
      </nav>
    </header>
    <main id="top">
${body}
    </main>
  </body>
</html>
`;
}

function screenshotGrid(
  feature: FeatureDefinition,
  assetsPrefix: string,
): string {
  const figures = feature.screenshots.flatMap((screenshot) =>
    DOCUMENTATION_VARIANTS.map((variant) => {
      const src = `${assetsPrefix}/features/${feature.slug}/${variant.key}/${screenshot.slug}.png`;
      const alt = `${screenshot.alt} in ${variant.label}`;
      const caption = feature.screenshots.length === 1
        ? variant.label
        : `${screenshot.title} · ${variant.label}`;
      return `<figure class="shot">
              <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">
              <figcaption>${escapeHtml(caption)}</figcaption>
            </figure>`;
    })
  ).join("\n");

  return `<div class="shot-grid" aria-label="${escapeHtml(feature.title)} screenshots">
            ${figures}
          </div>`;
}

function renderFeatureIndexArticles(features: readonly LoadedFeature[]): string {
  return features.map(({ feature }) => `<article class="feature" id="${escapeHtml(feature.slug)}">
          <div class="feature-copy">
            <h3><a href="features/${escapeHtml(feature.slug)}/index.html">${escapeHtml(feature.title)}</a></h3>
            <p>${renderInline(feature.summary)}</p>
            <p>${renderInline(feature.userValue)}</p>
            <p><a class="doc-link" href="features/${escapeHtml(feature.slug)}/index.html">Feature documentation</a></p>
          </div>
          ${screenshotGrid(feature, "assets")}
        </article>`).join("\n\n");
}

function renderFeatureDocsIndex(features: readonly LoadedFeature[]): string {
  const items = features.map(({ feature }) => `<li>
              <a href="features/${escapeHtml(feature.slug)}/index.html">${escapeHtml(feature.title)}</a>
              <span>${renderInline(feature.summary)}</span>
            </li>`).join("\n");

  return `<ul class="feature-doc-list">
            ${items}
          </ul>`;
}

function renderKeyboardShortcuts(features: readonly LoadedFeature[]): string {
  const featureSlugs = new Set(features.map(({ feature }) => feature.slug));
  const rows = COMMAND_SHORTCUTS
    .filter((command) => featureSlugs.has(command.featureSlug))
    .map((command) => `<tr>
              <td><kbd>${escapeHtml(formatHotkey(command.hotkey))}</kbd></td>
              <td><code>${escapeHtml(command.commandName)}</code></td>
              <td><a href="features/${escapeHtml(command.featureSlug)}/index.html">${escapeHtml(command.featureTitle)}</a></td>
              <td>${escapeHtml(command.explanation)}</td>
            </tr>`)
    .join("\n");

  return `<div class="shortcut-table-wrap">
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

function renderFeaturePage(feature: LoadedFeature): string {
  const criteria = feature.feature.acceptanceCriteria.map((criterion) =>
    `<li>${renderInline(criterion)}</li>`
  ).join("\n");
  const fixtures = feature.feature.fixturePaths.map((fixturePath) =>
    `<li><code>${escapeHtml(fixturePath)}</code></li>`
  ).join("\n");
  const fixtureSection = feature.feature.fixturePaths.length === 0 ? "" : `
      <section class="section feature-page-section" aria-labelledby="fixtures-title">
        <div class="section-heading">
          <p class="eyebrow">Fixtures</p>
          <h2 id="fixtures-title">Shared vault examples.</h2>
        </div>
        <ul class="feature-doc-list compact">
          ${fixtures}
        </ul>
      </section>`;

  const body = `      <section class="section feature-page-hero" aria-labelledby="feature-title">
        <p class="eyebrow">Feature</p>
        <h1 id="feature-title">${escapeHtml(feature.feature.title)}</h1>
        <p class="hero-text">${renderInline(feature.feature.summary)}</p>
      </section>

      <section class="section feature-page-section" aria-labelledby="why-title">
        <div class="feature-page-grid">
          <div class="section-heading">
            <p class="eyebrow">Rationale</p>
            <h2 id="why-title">Why it exists.</h2>
          </div>
          <div class="markdown-body">
            ${renderMarkdown(feature.whyMarkdown)}
          </div>
        </div>
      </section>

      <section class="section feature-page-section" aria-labelledby="criteria-title">
        <div class="section-heading">
          <p class="eyebrow">Executable documentation</p>
          <h2 id="criteria-title">Acceptance criteria.</h2>
        </div>
        <ul class="feature-doc-list">
          ${criteria}
        </ul>
      </section>

      <section class="section feature-page-section" aria-labelledby="screenshots-title">
        <div class="section-heading">
          <p class="eyebrow">Screenshots</p>
          <h2 id="screenshots-title">Generated by WDIO.</h2>
        </div>
        ${screenshotGrid(feature.feature, "../../assets")}
      </section>
${fixtureSection}`;

  return pageShell(
    `${feature.feature.title} · Tasks Eye`,
    feature.feature.summary.replaceAll("`", ""),
    body,
    "../../",
  );
}

async function build(): Promise<void> {
  const features = await discoverFeatures();
  const indexTemplate = await readFile(
    path.join(DOCS_SRC_ROOT, "index.md"),
    "utf8",
  );

  const indexMarkdown = indexTemplate
    .replaceAll("{{featureScreens}}", renderFeatureIndexArticles(features))
    .replaceAll("{{featureDocsIndex}}", renderFeatureDocsIndex(features))
    .replaceAll("{{keyboardShortcuts}}", renderKeyboardShortcuts(features));

  await writeFile(
    path.join(DOCS_ROOT, "index.html"),
    pageShell(
      "Tasks Eye for Obsidian",
      "Tasks Eye is an Obsidian plugin for note-centered GTD boards, validation, vacation markers, filtering, and completed-task review.",
      renderMarkdown(indexMarkdown),
    ),
  );

  const featurePagesRoot = path.join(DOCS_ROOT, "features");
  await rm(featurePagesRoot, { recursive: true, force: true });
  for (const feature of features) {
    const featureDir = path.join(featurePagesRoot, feature.feature.slug);
    await mkdir(featureDir, { recursive: true });
    await writeFile(path.join(featureDir, "index.html"), renderFeaturePage(feature));
  }
}

await build();
