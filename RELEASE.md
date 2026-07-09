# Release Flow

This project uses a local `release-it` flow for BRAT beta releases and public
Obsidian releases.

## Requirements

- Node `22.13.0` or newer.
- GitHub CLI (`gh`) installed and authenticated.
- A clean git worktree before starting.
- Push access to `origin`.

Check GitHub CLI authentication with:

```bash
gh auth status
```

## Commands

Create the next beta release:

```bash
npm run release
```

`npm run release` is the default release command and publishes a GitHub
pre-release for BRAT. From a public version such as `5.0.0`, it creates
`6.0.0-beta.1`. Re-running it from `6.0.0-beta.1` creates `6.0.0-beta.2`.

Create the public Obsidian release:

```bash
npm run release:public
```

`npm run release:public` is the only project command that creates a non-beta
release. From `6.0.0-beta.2`, it creates `6.0.0`. From a public version such as
`5.0.0`, it creates `6.0.0`.

There are no patch, minor, exact-version, full-test, or dry-run project
commands.

## What Happens

1. `release-it` refuses to run unless the git worktree is clean and the current
   branch is `master`.
2. `scripts/obsidian-release.mjs check` verifies that `package.json` and
   `package-lock.json` start with the same version. For public versions,
   `manifest.json` must also match. For beta versions, `manifest.json` may stay
   on the latest public version so Obsidian's official channel does not see the
   beta.
3. `npm test` runs the unit test suite.
4. `npm run build` creates the ignored `main.js` release asset.
5. `release-it` bumps `package.json` and `package-lock.json` to the next beta
   or public version.
6. `scripts/obsidian-release.mjs sync <version>` leaves `manifest.json` and
   `versions.json` unchanged for beta versions. For public versions, it copies
   that version into `manifest.json` and adds it to `versions.json`.
7. `release-it` commits the version metadata, tags the commit without a leading
   `v`, and pushes the commit and tag.
8. `scripts/obsidian-release.mjs github-release <version>` publishes a GitHub
   release with the BRAT assets:
   - `manifest.json`
   - `main.js`
   - `styles.css`

For beta releases, the GitHub release is marked as a pre-release. The uploaded
`manifest.json` asset is generated with the beta version, while the repository
root `manifest.json` remains on the latest public version.

`main.js` stays ignored by git. It is generated locally and uploaded only as a
GitHub release asset.

## BRAT Update

After the GitHub release is created, BRAT can install or update the plugin from:

```text
ggajos/ggajos-tasks-eye
```

The release tag, release title, and uploaded `manifest.json` asset all use the
same semantic version. Beta releases use versions such as `6.0.0-beta.1`.
Public releases use plain versions such as `6.0.0`.

## Documentation Screenshots

The release command does not run WDIO acceptance tests or update documentation
screenshots. Do that separately when visual documentation needs to change:

```bash
npm run acceptance:test
npm run docs:screenshots
```

Commit any screenshot or documentation changes before running `npm run release`
or `npm run release:public`.

## Failure Recovery

If the command fails before the version bump, fix the problem and rerun:

```bash
npm run release
```

If it fails after the version bump but before the release commit, restore the
version files and rerun:

```bash
git restore package.json package-lock.json manifest.json versions.json
npm run release
```

If it fails after pushing the tag but before creating the GitHub release, create
the release manually with the helper. This generates the correct
`manifest.json` release asset and marks beta releases as GitHub pre-releases:

```bash
node scripts/obsidian-release.mjs github-release <version>
```
