# AGENTS.md

## Project Overview

Tasks Eye is a TypeScript Obsidian plugin for note-centered task views. Source
code lives in `src/`, unit tests in `test/`, feature-owned executable docs in
`features/<slug>/`, and generated documentation in `docs/`.

## Common Commands

- `npm run build` type-checks and bundles the plugin.
- `npm run test:unit` runs Vitest.
- `npm run test:acceptance` builds and runs behavioral WDIO acceptance locally;
  it never captures documentation screenshots.
- `npm run test:visual` runs every visual test only inside the pinned Podman
  Linux/Xvfb environment and writes an ignored HTML comparison report.
- `npm run test:visual:approve` promotes a complete reviewed visual run and
  rebuilds generated docs. Visual runs never update baselines implicitly.
- `npm run docs` publishes accepted screenshots and rebuilds generated docs.
- `npm test` runs unit tests, local behavioral acceptance, Podman visual tests,
  and docs generation.

Use focused commands first when changing a narrow rule, then broaden only when
the change touches acceptance or generated docs.

Do not run visual WDIO directly on the host. `npm run test:visual` is the sole
visual-test entry point; the WDIO configuration rejects a host visual run.

## Validation Rules

Validation and row selection live primarily in `src/model.ts`.

- `validateFile()` owns note-level validation messages.
- `rowErrors()` filters validation messages shown on a board row.
- `rowMatchesMode()` controls which rows appear in Open, Inbox, and Hold.
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

## Developer Documentation

Keep developer setup, testing, visual-review, and release instructions in
`README.md`. Update it when commands or workflows change instead of adding a
separate developer guide.

## Fixtures

`acceptance/fixtures/base/` is only a minimal seed vault. Acceptance fixture
content belongs to its feature as TypeScript. Unit tests can build `EyeFile`
values directly with `buildEyeFileFromMarkdown()` or feature `testSupport`
helpers.
