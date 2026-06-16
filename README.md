# codex-usage-analyzer

`codex-usage-analyzer` is the local usage analysis package that emits `UsageSnapshot v2` JSON.

The package is designed to be reused by product-specific CLIs and web services. It analyzes local usage sources and returns a validated snapshot; account identity, submit tokens, public profile URLs, and rendered cards belong to the product that wraps it.

## CLI

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

## Non-Goals

This package does not:

- perform GitHub OAuth
- call internal Codex Desktop profile APIs
- export custom pet image files by default
- issue or store submit tokens
- own public profile handles
- render cards or images
- update GitHub README files
- upload raw credential files
- expose local private paths

## Status

This repository starts as a standalone home for the analyzer package. The production analyzer path is separated from the packaged sample fixture. npm publishing, release automation, and broader parity work against Codex Desktop profile data are follow-up work.
