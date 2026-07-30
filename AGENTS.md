# AGENTS.md

## Project Overview

Tasks Eye is a TypeScript Obsidian plugin for note-centered task views. Source
code lives in `src/`, unit tests in `test/`, feature-owned executable docs in
`features/<slug>/`, and generated documentation in `docs/`.

## Common Commands

- `npm run build` type-checks and bundles the plugin.
- `npm test` runs the Vitest unit suite only; this is the regular development
  feedback loop.
- `npm run test:visual` runs all behavioral and screenshot WDIO scenarios only
  inside the pinned Podman Linux/Xvfb environment and writes an ignored HTML
  comparison report. It also regenerates five 1200×800 PNG showcase cards in
  `acceptance/artifacts/community-submission/` from the run's dark-theme
  captures.
- `npm run test:visual:approve` promotes a complete reviewed visual run and
  rebuilds generated docs. Visual runs never update baselines implicitly.
- `npm run docs` publishes accepted screenshots and rebuilds generated docs.
- `npm run release` publishes a beta after the unit, build, and docs gates.
- `npm run release:public` publishes a stable release and additionally requires
  the Podman WDIO gate to pass without visual differences.

Create stable releases only with `npm run release:public`. Let the release
automation bump version files, create and push the release commit and tag, and
publish the GitHub assets. Do not edit release versions manually, rewrite tags,
replace published releases, or invoke internal release helpers directly.

Use focused commands first when changing a narrow rule, then broaden only when
the change touches integration behavior or generated docs.

Do not run WDIO directly on the host. `npm run test:visual` is the sole WDIO
entry point; the WDIO configuration rejects every host run.

## Validation Rules

Validation and row selection live primarily in `src/model.ts`.

- `validateFile()` owns note-level validation messages.
- `rowErrors()` filters validation messages shown on a board row.
- `rowMatchesMode()` controls which rows appear in Focus, Open, and Inbox.
- `buildRowModel()` controls row labels, next-action selection, and row state.

Inbox is the repair queue: a row appears there when its model has validation
errors.

## Feature Documentation

Public features live under `features/<slug>/` with:

- `feature.ts` for typed feature metadata.
- `why.md` for short rationale.
- Optional `*.test.ts` Vitest coverage near the feature.
- Optional `wdio.ts` screenshot or acceptance scenarios.

Every WDIO scenario owns a complete typed fixture created with the helpers in
`features/fixtures.ts`; scenarios must not depend on notes from another feature
or on the minimal acceptance seed vault. Use structured note/task helpers for
normal cases and literal Markdown when exact syntax is the behavior under test.

Violation feature fixtures automatically drive their model contract plus the
standard Inbox/Open screenshots. A `wdio.ts` scenario with the same screenshot
slug overrides the generated flow; other explicit scenarios are additive.
Feature screenshots referenced in `feature.ts` must match the final scenario
slugs.

Generated docs under `docs/` and `docs-src/src/content/docs/features/` are
rebuilt by `npm run docs`; avoid hand-editing generated output unless the task
explicitly asks for it.

Screenshot baselines under `acceptance/snapshots/docs/` change only through
`npm run test:visual:approve` after reviewing the report at
`acceptance/artifacts/visual/report/index.html`.

Agents must never run `npm run test:visual:approve`, directly edit screenshot
baselines, or otherwise promote or delete visual results. After
`npm run test:visual`, report the comparison-report path and ask the user to
review it and run the approval command themselves.

## Developer Documentation

Keep developer setup, testing, visual-review, release, and contributor workflow
instructions in `AGENTS.md`. Update this file when commands or workflows
change. Keep `README.md` focused on public, user-facing product documentation;
do not add a separate developer guide.

## Intentionally Unresolved Obsidian Review Findings

The following review findings are known and deliberately remain unresolved.
Do not silence or work around them without revisiting the stated constraint:

- **Missing GitHub artifact attestations for `main.js` and `styles.css`:**
  releases are intentionally built and published by the local release
  automation. GitHub Actions is not the authoritative builder, so adding a
  post-hoc attestation would misrepresent provenance. Reproducible build
  verification remains the integrity check.
- **No declarative settings definitions and deprecated `display()`:** the
  `getSettingDefinitions()` API requires Obsidian 1.13, which is not yet
  available in the development runtime. Tasks Eye continues to support
  Obsidian 1.12.7 and keeps the tested imperative settings implementation until
  a dual-path migration can be exercised against 1.13.
- **Unknown `starlight-tabs` CSS type selector:** these selectors live in the
  documentation stylesheet and target a real custom element defined by
  `@astrojs/starlight`; they are not plugin runtime CSS. The generic CSS review
  warning is a false positive, so the valid selectors remain unchanged.

## Fixtures

`acceptance/fixtures/base/` is only a minimal seed vault. Acceptance fixture
content belongs to its feature as TypeScript. Unit tests can build `EyeFile`
values directly with `buildEyeFileFromMarkdown()` or feature `testSupport`
helpers.
