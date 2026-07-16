import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const visualRoot = path.resolve(root, "acceptance", "artifacts", "visual");
const reportRoot = path.join(visualRoot, "report");
const manifestPath = path.join(visualRoot, "manifest.json");
const reportPath = path.join(reportRoot, "index.html");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hrefFor(file) {
  return path.relative(reportRoot, path.resolve(root, file))
    .split(path.sep)
    .join("/");
}

function imagePane(label, file) {
  if (!file || !existsSync(path.resolve(root, file))) {
    return `<figure class="pane missing"><figcaption>${escapeHtml(label)}</figcaption><div>Not available</div></figure>`;
  }
  const href = hrefFor(file);
  return `<figure class="pane"><figcaption>${escapeHtml(label)}</figcaption><a href="${escapeHtml(href)}"><img src="${escapeHtml(href)}" alt="${escapeHtml(label)}" loading="lazy"></a></figure>`;
}

function resultCard(result) {
  const mismatch = result.mismatchPercentage === undefined
    ? ""
    : ` · ${result.mismatchPercentage}% mismatch`;
  const error = result.error
    ? `<pre>${escapeHtml(result.error)}</pre>`
    : "";
  return `<article class="result ${escapeHtml(result.status)}">
    <header><code>${escapeHtml(result.key)}</code><span>${escapeHtml(result.status)}${escapeHtml(mismatch)}</span></header>
    ${error}
    <div class="panes">
      ${imagePane("Expected", result.baseline)}
      ${imagePane("Actual", result.actual)}
      ${result.status === "matched" ? "" : imagePane("Difference", result.diff)}
    </div>
  </article>`;
}

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (error) {
  manifest = {
    completed: false,
    expected: [],
    staleBaselines: [],
    results: [],
    reportError: error instanceof Error ? error.message : String(error),
  };
}

const changed = manifest.results.filter(({ status }) => status !== "matched");
const matched = manifest.results.filter(({ status }) => status === "matched");
const stale = manifest.staleBaselines ?? [];
const status = manifest.completed && changed.length === 0 && stale.length === 0
  ? "clean"
  : "review";
const reportError = manifest.reportError
  ? `<p class="error">The visual run did not initialize: ${escapeHtml(manifest.reportError)}</p>`
  : "";
const staleHtml = stale.length === 0
  ? ""
  : `<section><h2>Stale baselines</h2><ul>${stale.map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join("")}</ul></section>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tasks Eye visual report</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #111318; color: #e8eaf0; }
    body { margin: 0 auto; max-width: 1600px; padding: 32px; }
    h1, h2 { margin: 0 0 16px; }
    .summary { background: #1b1f28; border: 1px solid #303644; border-radius: 10px; margin-bottom: 28px; padding: 18px; }
    .summary p { margin: 6px 0 0; color: #b7becd; }
    .summary.clean { border-color: #287a52; }
    .summary.review { border-color: #a96d2c; }
    .error, pre { color: #ffb4ab; }
    details { margin-top: 28px; }
    summary { cursor: pointer; font-size: 1.4rem; font-weight: 700; margin-bottom: 16px; }
    .result { background: #1b1f28; border: 1px solid #303644; border-radius: 10px; margin: 0 0 20px; overflow: hidden; }
    .result.changed, .result.missing-baseline, .result.error { border-color: #a96d2c; }
    .result header { align-items: center; display: flex; gap: 16px; justify-content: space-between; padding: 12px 16px; }
    .result header span { color: #b7becd; text-align: right; }
    pre { margin: 0; overflow: auto; padding: 0 16px 16px; white-space: pre-wrap; }
    .panes { display: grid; gap: 1px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); background: #303644; }
    .pane { background: #111318; margin: 0; min-width: 0; padding: 12px; }
    .pane figcaption { color: #b7becd; font-weight: 700; margin-bottom: 10px; }
    .pane img { background: #20242d; display: block; height: auto; max-width: 100%; }
    .pane.missing div { align-items: center; background: #20242d; color: #8f97a8; display: flex; min-height: 160px; justify-content: center; }
    code { overflow-wrap: anywhere; }
    a { color: inherit; }
  </style>
</head>
<body>
  <section class="summary ${status}">
    <h1>Tasks Eye visual report</h1>
    <p>${manifest.completed ? "Complete run" : "Incomplete run"} · ${changed.length} changed or failed · ${matched.length} matched · ${stale.length} stale</p>
    <p>Baselines are unchanged. After reviewing every difference, run <code>npm run test:visual:approve</code>.</p>
  </section>
  ${reportError}
  ${staleHtml}
  <details open><summary>Differences (${changed.length})</summary>${changed.length === 0 ? "<p>No visual differences.</p>" : changed.map(resultCard).join("")}</details>
  <details><summary>Unchanged (${matched.length})</summary>${matched.map(resultCard).join("")}</details>
</body>
</html>`;

await mkdir(reportRoot, { recursive: true });
await writeFile(reportPath, html);
console.log(`Visual report written to ${reportPath}`);

