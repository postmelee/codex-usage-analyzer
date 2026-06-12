# codex-usage-analyzer

`codex-usage-analyzer` is the local usage analysis package that emits `UsageSnapshot v2` JSON.

The package is designed to be reused by product-specific CLIs and web services. It analyzes local usage sources and returns a validated snapshot; account identity, submit tokens, public profile URLs, and rendered cards belong to the product that wraps it.

## CLI

```bash
npx codex-usage-analyzer@latest analyze --json
```

The `--json` mode writes a single `UsageSnapshot v2` object to stdout. Errors and usage text are written to stderr.

Local repository smoke command:

```bash
node bin/codex-usage-analyzer.js analyze --json
```

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

The current implementation is a contract-first skeleton. It returns a sample-backed `UsageSnapshot v2` object while the real local source parser is implemented in a later task.

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
```

The test suite validates the SDK exports, CLI behavior, and `UsageSnapshot v2` schema rules.

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

This repository starts as a standalone home for the analyzer package. npm publishing, release automation, and the real local source parser are follow-up work.
