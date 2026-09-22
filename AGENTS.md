# AGENTS.md

## Project Overview

Tasks Eye is a TypeScript Obsidian plugin for note-centered task views. Source
code lives in `src/`, unit tests in `test/`, feature-owned executable docs in
`features/<slug>/`, and generated documentation in `docs/`.

## Common Commands

| Category | Command | Use |
| --- | --- | --- |
| Essential | `npm run build` | Format, type-check, and bundle the plugin. |
| Essential | `npm test` | Run the Vitest unit suite; the regular development feedback loop. |
| Essential | `npm run test:visual` | Run behavioral and screenshot WDIO tests in pinned Podman Linux/Xvfb, overwrite tracked screenshots, generate five community-submission cards, then run `dev:docs`. |
| Local/optional | `npm run dev:coverage` | Run Vitest with coverage. |
| Local/optional | `npm run dev:docs` | Publish screenshots and build generated docs |
| Local/optional | `npm run dev:docs:serve` | Rebuild docs, then preview them at `http://127.0.0.1:4173/`. |
| Operations | `npm run ops:release:beta` | Publish a beta after the unit, build, and docs gates. |
| Operations | `npm run ops:release:public` | Publish a stable release; additionally requires Podman WDIO to leave screenshots and generated docs unchanged. |

Create stable releases only with `npm run ops:release:public`. Let the release
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
rebuilt by `npm run dev:docs` (and therefore `npm run test:visual`); avoid
hand-editing generated output unless the task explicitly asks for it.

Screenshots live under `acceptance/snapshots/docs/features/<slug>/`
and are committed PNGs, so every baseline change is visible in `git status` and
reviewable as an image diff in a pull request.

Agents must never stage or discard screenshot changes. Deciding whether a
rendering change is intended is a human judgement. After `npm run test:visual`,
report the changed paths for the user to review in VS Code's Source Control
image diff.

## Visual Development Flow

Screenshots use one theme only: `dark-minimal` (Minimal theme on a dark base),
defined once in `features/visualTheme.ts`.

- **Ordinary development** — run `npm test`. Visual runs are only for
  rendering-affecting work and pre-release checks.
- **Adding a feature screenshot** — write `feature.ts` and `wdio.ts`, then run
  `npm run test:visual`. The run writes the PNG into the tracked screenshot
  tree and rebuilds docs. Review it in VS Code's Source Control image diff,
  then commit it.
- **Changing behavior that alters rendering** — run `npm run test:visual`.
  Review the changed PNGs in VS Code's Source Control image diff. Stage
  intentional changes; discard unintended ones with git, fix the code, and
  re-run.
- **Removing a screenshot scenario** — run `npm run test:visual`. The end-of-run
  prune deletes its now-unwritten PNG, which appears as a deletion in git.

The invariant: every visual run writes the complete tracked screenshot tree;
git is the only visual diff. `@wdio/visual-service` provides deterministic
element capture, while the repository does no image comparison or report
generation. The container mounts `acceptance/snapshots` read-write so captures
persist on the host. `npm run ops:release:public` fails when that run leaves
screenshots or generated docs dirty.

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

## Fixtures

`acceptance/fixtures/base/` is only a minimal seed vault. Acceptance fixture
content belongs to its feature as TypeScript. Unit tests can build `EyeFile`
values directly with `buildEyeFileFromMarkdown()` or feature `testSupport`
helpers.
