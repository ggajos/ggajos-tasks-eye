# AGENTS.md

## Project Overview

Tasks Eye is a TypeScript Obsidian plugin for note-centered task views. Source
code lives in `src/`, unit tests in `test/`, feature-owned executable docs in
`features/<slug>/`, and generated documentation in `docs/`.

## Common Commands

- `npm run build` type-checks and bundles the plugin.
- `npm run test:unit` runs Vitest.
- `npm run test:acceptance` builds and runs the WDIO Obsidian acceptance suite.
- `npm run docs` publishes accepted screenshots and rebuilds generated docs.
- `npm test` runs unit tests, acceptance tests, and docs generation.

Use focused commands first when changing a narrow rule, then broaden only when
the change touches acceptance or generated docs.

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

When a feature has `wdio.ts`, it must export valid scenario arrays as expected
by `acceptance/support/tasks-eye.ts`. Feature screenshots referenced in
`feature.ts` must match screenshot scenario slugs.

Generated docs under `docs/` and `docs-src/src/content/docs/features/` are
rebuilt by `npm run docs`; avoid hand-editing generated output unless the task
explicitly asks for it.

## Fixtures

Acceptance fixtures live under `acceptance/fixtures/base/`. Unit tests can build
`EyeFile` values directly with `buildEyeFileFromMarkdown()` or feature
`testSupport` helpers.
