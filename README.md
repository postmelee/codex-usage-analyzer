# codex-usage-analyzer

`codex-usage-analyzer` is the local usage analysis package that emits `UsageSnapshot v2` JSON.

The package is designed to be reused by product-specific CLIs and web services. It analyzes local usage sources and returns a validated snapshot; account identity, submit tokens, public profile URLs, and rendered cards belong to the product that wraps it.

## CLI

```bash
npx codex-usage-analyzer@latest analyze --json
```

The `--json` mode writes a single `UsageSnapshot v2` object to stdout. Errors and usage text are written to stderr.

Until the real local parser lands, the production `analyze --json` path emits a valid unavailable snapshot: required numeric totals are zero, unavailable details are `null` or empty arrays, and `extensions["codexUsageAnalyzer.diagnostics"]` explains that the local parser is not implemented yet. The production path does not return the sample fixture.

Local repository smoke command:

```bash
node bin/codex-usage-analyzer.js analyze --json
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

`analyzeUsage()` returns the production analyzer result. While the real local source parser is implemented in later tasks, unavailable fields use zero, `null`, empty arrays, and a namespaced diagnostic extension rather than sample values.

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

The analyzer owns local usage fields such as token totals, token breakdown, model usage, skill usage, plugin usage, and activity statistics.

Web products own GitHub login, display name, avatar URL, bio, profile visibility, submit tokens, devices, public URLs, and rendered cards.

Product-specific wrappers can call this SDK and submit the resulting snapshot to their own service:

```js
import {
  analyzeUsage,
  assertUsageSnapshotV2
} from "codex-usage-analyzer";

const snapshot = assertUsageSnapshotV2(await analyzeUsage());
await submitToProductService({ snapshot });
```

Wrapper metadata such as bearer tokens, device ids, account handles, visibility, GitHub bio, GitHub avatar URLs, and card-only rendering hints must stay outside the analyzer snapshot.

## Tests

```bash
npm test
node bin/codex-usage-analyzer.js analyze --json
node bin/codex-usage-analyzer.js analyze --json --fixture-sample
```

The test suite validates the SDK exports, production CLI behavior, fixture-only CLI behavior, and `UsageSnapshot v2` schema rules.

## Non-Goals

This package does not:

- perform GitHub OAuth
- issue or store submit tokens
- own public profile handles
- render cards or images
- update GitHub README files
- upload raw credential files
- expose local private paths

## Status

This repository starts as a standalone home for the analyzer package. The production analyzer path is separated from the packaged sample fixture. npm publishing, release automation, and the real local source parser are follow-up work.
