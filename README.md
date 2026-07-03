# codex-usage-analyzer

`codex-usage-analyzer` is the local usage analysis package that emits `UsageSnapshot v2` JSON.

The package is designed to be reused by product-specific CLIs and web services. It analyzes local usage sources and returns a validated snapshot; account identity, submit tokens, public profile URLs, and rendered cards belong to the product that wraps it.

## CLI

The published CLI entry point is:

```bash
npx codex-usage-analyzer@latest analyze --json
```

The `--json` mode writes a single `UsageSnapshot v2` object to stdout. Errors and usage text are written to stderr.

The production `analyze --json` path reads local Codex session JSONL files from the Codex home directory. It uses `--codex-home <path>` when provided, otherwise `CODEX_HOME`, otherwise the default Codex home. When the session source is missing or unreadable, the command still emits a valid snapshot: required numeric totals are zero, unavailable usage details are `null` or empty arrays, and `extensions["codexUsageAnalyzer.diagnostics"]` explains the unavailable source. The production path does not return the sample fixture.

The parser currently derives token totals, daily token buckets, model ranking, skill/plugin ranking, longest task duration, streaks, reasoning effort, and total thread count from allowlisted session event fields. Skill/plugin rankings are counted only from actual invocation events that can be classified by session tool catalog metadata; catalog or enabled-tool lists alone do not increment usage. Custom/local skill and plugin names may appear in `topSkills` and `topPlugins`, but the analyzer does not emit raw local file paths, raw JSONL lines, session ids, prompts, responses, tool input, or tool output.

Streak fields are local-only analyzer results. The current parser treats a UTC date as active when local session JSONL contains positive `last_token_usage` for that date.

Codex Desktop's profile screen is backed by its remote profile data and may include account-level usage that is no longer present in local session files, usage from another device, or data retained after local cleanup. For that reason, `activity.currentStreakDays` and `activity.longestStreakDays` are not guaranteed to match the Codex Desktop profile. The diagnostic extension includes `profileComparison.parity: "not_guaranteed"` when the analyzer has not compared against a remote profile baseline.

The analyzer does not call Codex Desktop remote profile APIs or plugin-store APIs. `skills` and `plugins` are local session-derived fields, so they are unavailable when actual invocation source events are absent.

`codexAssets.pet` is a safe logical reference, not an image export. The analyzer can report the Codex Desktop built-in pet catalog and the selected pet id when that setting is available. If no selected pet setting is persisted, it follows Codex Desktop's default and reports the built-in `codex` pet as `codex-built-in:pet:codex`. When a selected custom pet is found under `pets/<id>/pet.json` with an allowlisted spritesheet extension, the analyzer reports `codex-local:pet:custom-selected`.

The default analyzer output does not include local file paths, custom pet directory names, image bytes, data URLs, or generated image artifacts. Files under `generated_images/` are treated as private generated artifacts and are not promoted to `codexAssets`. A wrapper that wants to render custom pet images in a web application must provide its own opt-in asset export, upload, or local serving layer.

Local repository smoke command:

```bash
node bin/codex-usage-analyzer.js analyze --json
```

Parser fixture smoke command:

```bash
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
```

Asset fixture smoke command:

```bash
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/assets
```

Development fixture command:

```bash
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
```

The `--fixture-sample` mode is for tests, examples, and contract inspection only. It returns the packaged sample snapshot and must not be treated as real local Codex usage.

## Profile Parity Smoke (Repository Only)

Use the profile smoke helper from a repository checkout when you want to compare
a local analyzer result with values manually copied from Codex Desktop's profile
UI. The comparison uses a redacted baseline file; do not commit a baseline copied
from a real account.

The helper is not published as an npm package binary. It is a maintainer QA
tool for release and parser parity checks.

Create a production snapshot:

```bash
node bin/codex-usage-analyzer.js analyze --json > <local-snapshot.json>
```

Create a redacted baseline using
`src/__tests__/fixtures/profile-baseline/redacted-baseline.json` as the shape
reference, then compare:

```bash
node scripts/profile-smoke.js --baseline <redacted-baseline.json> --snapshot <local-snapshot.json>
```

The smoke output is a field-level summary. Result statuses mean:

- `match`: expected and actual values are equal.
- `within_tolerance`: numeric values differ only within the baseline tolerance.
- `mismatch`: the field is comparable and differs outside tolerance.
- `not_comparable`: the baseline intentionally marks the field as visible in
  profile UI but not comparable to local analyzer data.
- `skipped`: the baseline did not include that expected field.

Mismatch reasons distinguish parser-bug candidates from expected source
differences:

- `numeric_mismatch`, `value_mismatch`, `actual_field_absent`, and ranking
  shape reasons mean a comparable field differed.
- `source_mismatch` means the baseline author marked that field as comparing
  different sources, such as remote profile data versus local analyzer data.
- `profile_parity_not_guaranteed` means the local snapshot itself reports that
  remote profile parity is not guaranteed, and the field is source-sensitive.
- `remote_profile_source_differs` is used with `not_comparable` fields that
  should be visible in the profile baseline but intentionally not compared.

Use optional baseline `sourcePolicy` metadata to keep a field comparable while
labeling source-driven differences:

```json
{
  "sourcePolicy": {
    "activity.totalThreads": "source_mismatch",
    "skills.topSkills": "source_mismatch",
    "plugins.topPlugins": "source_mismatch"
  }
}
```

`sourcePolicy` belongs only to the redacted smoke baseline. It is not part of
`UsageSnapshot v2`, and the analyzer output schema does not change. A
source-aware mismatch still makes the smoke command exit nonzero; the field
reason is what separates source differences from likely parser regressions.

Known mismatch reasons:

- Codex Desktop profile values can come from a remote account-level source,
  while this analyzer reads local session files and local Codex metadata.
- Local cleanup, migration, archiving, deletion, or another device can make the
  profile UI and local analyzer cover different source ranges.
- Streaks use the analyzer's UTC date buckets from local token events; profile
  UI can use remote activity data.
- Activity insights and thread counts can differ when the profile UI aggregates
  remote account-level data and the analyzer reads retained local sessions.
- Top skills/plugins require actual local invocation events. Catalog, enabled
  tool lists, or remote profile rankings alone are not counted.
- `--fixture-sample` snapshots are rejected by the profile smoke helper, so a
  packaged example cannot pass as a real profile parity check.

Redaction rules for real local baselines:

- Keep only profile-visible numbers, model ids, ranking ids, and explicit
  tolerance values needed for comparison.
- Do not include real account handles, emails, local private paths, credential
  material, conversation identifiers, conversation titles, prompts, responses,
  tool input/output bodies, image captures, or unredacted session JSONL.

## SDK

```js
import {
  analyzeUsage,
  assertUsageSnapshotV2,
  createSampleUsageSnapshotV2,
  validateUsageSnapshotV2
} from "codex-usage-analyzer";

const snapshot = await analyzeUsage();
assertUsageSnapshotV2(snapshot);
```

`analyzeUsage()` returns the production analyzer result. You can pass `codexHome` for deterministic tests or custom Codex home discovery:

```js
const snapshot = await analyzeUsage({
  codexHome: "/path/to/codex-home"
});
```

When a local source is unavailable, fields use zero, `null`, empty arrays, and a namespaced diagnostic extension rather than sample values.

Use `createSampleUsageSnapshotV2()` only for examples, tests, and contract inspection.

Public exports:

- `analyzeUsage(options?)`
- `createSampleUsageSnapshotV2(overrides?)`
- `validateUsageSnapshotV2(value)`
- `assertUsageSnapshotV2(value)`
- `isUsageSnapshotV2(value)`
- `USAGE_SNAPSHOT_V2_SCHEMA_VERSION`
- `sampleUsageSnapshotV2`

## Package Contents

The npm package includes the CLI entry point, runtime analyzer source, parser
modules, snapshot validators, type declarations, and the sample snapshot fixture
used by the SDK. It excludes repository tests, parser fixtures, working docs,
and repository-only smoke helper scripts.

## License

The source code and associated documentation in this repository are available
under the MIT License. See `LICENSE`.

This license applies only to this repository's code and documentation. It does
not grant rights to OpenAI, Codex, OpenAI services, user local data, Codex
Desktop assets, model outputs, trademarks, or third-party content. This project
is not affiliated with, endorsed by, or sponsored by OpenAI.

## Ownership Boundary

The analyzer owns local usage fields such as token totals, token breakdown, model usage, skill usage, plugin usage, activity statistics, and safe Codex pet logical references.

Web products own GitHub login, display name, avatar URL, bio, profile visibility, submit tokens, devices, public URLs, rendered cards, and any uploaded or web-served pet image assets.

Product-specific wrappers can call this SDK and submit the resulting snapshot to their own service:

```js
import {
  analyzeUsage,
  assertUsageSnapshotV2
} from "codex-usage-analyzer";

const snapshot = assertUsageSnapshotV2(await analyzeUsage());
await submitToProductService({ snapshot });
```

Wrapper metadata such as bearer tokens, device ids, account handles, visibility, GitHub bio, GitHub avatar URLs, custom pet upload URLs, and card-only rendering hints must stay outside the analyzer snapshot.

## Tests

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/parser
node bin/codex-usage-analyzer.js analyze --json --codex-home src/__tests__/fixtures/assets
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
```

The test suite validates the SDK exports, production parser behavior, asset safe output behavior, fixture-only CLI behavior, and `UsageSnapshot v2` schema rules.

## Release Checklist

Use this order for every npm release after `0.1.0`. npm does not allow
reusing a published package name and version, so every follow-up publish must
choose a new `package.json` version first.

Choose the version bump before opening a release prep PR:

- Patch: backwards-compatible bug fixes, documentation corrections, package
  metadata corrections, or release process corrections.
- Minor: backwards-compatible CLI, API, or analyzer capability additions.
- Major: breaking CLI, API, package, or `UsageSnapshot v2` behavior changes.

Treat `UsageSnapshot v2` contract changes as a separate issue with consumer
impact analysis before choosing the release version.

In the release prep PR, update only the package version and related release
notes. Do not create a git tag, GitHub Release, or npm publish from the release
prep PR.

```bash
npm version --no-git-tag-version <patch|minor|major>
npm test
npm pack --dry-run
node bin/codex-usage-analyzer.js analyze --json
npx --yes github:postmelee/codex-usage-analyzer analyze --json
```

Review `package.json` and the `npm pack --dry-run` file list before merging.
The version bump PR must be merged to `main` before publishing.

After the version bump PR is merged, tag the `main` merge commit:

```bash
git checkout main
git pull --ff-only
git tag vX.Y.Z
git push origin vX.Y.Z
```

Trusted publishing setup for maintainers:

- Configure the npm package's Trusted Publisher setting for GitHub Actions.
- Use workflow filename `publish.yml` and allowed action `npm publish`.
- Do not add npm token secrets to the publish workflow; it uses GitHub Actions
  OIDC with `id-token: write`.
- Do not pass `--provenance`; trusted publishing generates provenance
  automatically.
- Do not run the publish workflow until the version bump PR has been merged and
  the matching `vX.Y.Z` tag has been pushed.

Confirm the registry state before running the manual-only publish workflow:

```bash
npm view codex-usage-analyzer version dist-tags --json
```

Then publish from GitHub Actions:

```text
GitHub Actions -> Publish Package -> Run workflow
```

After the package is published, verify the registry version and smoke the
published CLI:

```bash
npm view codex-usage-analyzer version dist-tags --json
npx --yes codex-usage-analyzer@latest analyze --json
```

Verify registry signatures in a throwaway verification project:

```bash
VERIFY_DIR="$(mktemp -d)"
cd "$VERIFY_DIR"
npm init -y
npm install codex-usage-analyzer@latest
npm audit signatures
```

Create the GitHub Release only after npm publish, `npx @latest` smoke, and
signature verification have passed. Use the pushed `vX.Y.Z` tag and record the
new npm version, structural smoke result, signature verification result, and any
known limitations.

Do not paste raw production snapshot output into release notes, PR bodies, or
issue comments. Record only structural pass/fail results, exit codes, and
package metadata needed for release verification.

## Non-Goals

This package does not:

- perform GitHub OAuth
- use private Codex Desktop profile endpoints
- export custom pet image files by default
- issue or store submit tokens
- own public profile handles
- render cards or images
- update GitHub README files
- upload raw credential files
- expose local private paths

## Status

This repository is the standalone home for the analyzer package. Version `0.1.0` is published to npm and verified with `npx codex-usage-analyzer@latest analyze --json`. The production analyzer path is separated from the packaged sample fixture, and the release checklist above is the maintainer path for future npm publishing and npx verification. Broader parity work against Codex Desktop profile data remains outside the npm release flow.
