# codex-usage-analyzer

[![npm package](https://img.shields.io/npm/v/codex-usage-analyzer)](https://www.npmjs.com/package/codex-usage-analyzer)
[![CI](https://github.com/postmelee/codex-usage-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/postmelee/codex-usage-analyzer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Read the account usage shown by Codex through the official app-server protocol, from one small CLI.

`codex-usage-analyzer` starts your installed Codex CLI, calls `account/usage/read`, and emits a stable, identity-free contract. It does not scan local sessions or directly read authentication files, tokens, keychains, prompts, or responses.

## Support
Maintained with support from **OpenAI’s [Codex for Open Source](https://developers.openai.com/community/codex-for-oss)** program.
> _Support is provided to the maintainer and does not imply endorsement._

## Quick start

```bash
npx --yes codex-usage-analyzer@latest
```

Human-readable output:

```text
Codex account usage

Lifetime tokens    1.23B
Peak daily tokens  45.6M
Longest turn       12m 34s
Current streak     3 days
Longest streak     21 days
Daily buckets      30 days

Captured at 2026-07-11T00:00:00.000Z
```

The values above are synthetic. Your command reads the usage available to the currently signed-in Codex account.

For machine-readable output:

```bash
npx --yes codex-usage-analyzer@latest --json
```

```json
{
  "contractVersion": 1,
  "capturedAt": "2026-07-11T00:00:00.000Z",
  "summary": {
    "lifetimeTokens": 1234567890,
    "peakDailyTokens": 45600000,
    "longestRunningTurnSec": 754,
    "currentStreakDays": 3,
    "longestStreakDays": 21
  },
  "dailyUsageBuckets": [
    {
      "startDate": "2026-07-10",
      "tokens": 123456
    }
  ]
}
```

## Why this CLI

- **Account-level source:** use the same app-server method intended for Codex account usage instead of estimating from retained local files.
- **Privacy-first boundary:** receive usage metrics without adding names, usernames, avatars, emails, account identifiers, or credentials to the output.
- **Stable integration:** consume a versioned JSON contract with allowlisted fields and explicit `null` semantics.
- **Small runtime:** use Node.js built-ins and the Codex CLI already installed on your machine; there are no runtime package dependencies.

## Supported metrics

| Field | Meaning |
|---|---|
| `summary.lifetimeTokens` | Lifetime token usage |
| `summary.peakDailyTokens` | Highest token usage reported for one day |
| `summary.longestRunningTurnSec` | Longest-running turn, in seconds |
| `summary.currentStreakDays` | Current activity streak, in days |
| `summary.longestStreakDays` | Longest activity streak, in days |
| `dailyUsageBuckets` | Source-dated daily token buckets, when available |

Every summary field is present. A value of `null` means the upstream method did not provide that metric; it does not mean zero. Daily buckets can likewise be `null`, an empty array, or an array of dated values.

## Requirements

- Node.js 20 or newer
- A recent Codex CLI available as `codex` on `PATH`
- A ChatGPT-backed Codex sign-in that supports `account/usage/read`

API-key-only and Bedrock authentication do not provide this account usage method. Sign in through the installed Codex CLI before running the analyzer. The package delegates authentication to Codex and never asks you to paste a token.

## CLI reference

```text
codex-usage-analyzer - Read your Codex account usage

Usage:
  codex-usage-analyzer [usage] [--json]
  codex-usage-analyzer [usage] --help
  codex-usage-analyzer --version
```

| Command | Output |
|---|---|
| `codex-usage-analyzer` | Human-readable account usage |
| `codex-usage-analyzer usage` | Same human-readable output |
| `codex-usage-analyzer --json` | Account Usage Contract JSON |
| `codex-usage-analyzer usage --json` | Same JSON output |
| `codex-usage-analyzer --help` | Help without starting app-server |
| `codex-usage-analyzer --version` | Package version without starting app-server |

Successful output is written to stdout. Failures are written to stderr as a stable error code and a safe message, without raw RPC data or app-server stderr.

## SDK

```js
import {
  ACCOUNT_USAGE_CONTRACT_VERSION,
  CodexUsageError,
  readAccountUsage
} from "codex-usage-analyzer";

try {
  const usage = await readAccountUsage({ timeoutMs: 15_000 });
  console.log(usage.contractVersion === ACCOUNT_USAGE_CONTRACT_VERSION);
} catch (error) {
  if (error instanceof CodexUsageError) {
    console.error(error.code);
  }
}
```

The SDK returns the same document as CLI `--json`. See the [Account Usage Contract](docs/account-usage-contract.md) and [JSON Schema](docs/account-usage.schema.json) for field and compatibility rules.

## How it works

1. Spawn `codex app-server` without a shell.
2. Complete the stable app-server initialization handshake.
3. Call `account/usage/read`.
4. Allowlist and validate the supported fields.
5. Stop the child process and return the normalized document.

The package has no direct credential reader and no private profile endpoint fallback. Authentication and service communication remain inside the installed Codex process.

## Downstream integrations

Profile sites, README cards, and other services can accept the identity-free JSON contract and combine it with identity they manage separately. The [Downstream Integration Guide](docs/downstream-integration.md) defines recommended field names, ownership, submit-token, validation, rendering, caching, and deletion boundaries.

Do not add identity fields to the account usage document. A downstream service should resolve GitHub identity from its own authenticated account binding, not trust a display name or avatar submitted by this CLI.

## Privacy and Security

The default CLI does not directly read or emit:

- access tokens, refresh tokens, cookies, or keychain entries
- names, usernames, avatars, emails, or account identifiers
- prompts, responses, tool input, tool output, or local session files
- local filesystem paths, raw RPC responses, or raw app-server stderr

Treat account usage as private data even though the contract excludes identity. Review a downstream service's retention and visibility policy before submitting output anywhere.

For vulnerability reporting and supported versions, see [SECURITY.md](SECURITY.md).

## Troubleshooting

| Error code | What to check |
|---|---|
| `CODEX_NOT_FOUND` | Install or update Codex and confirm `codex` is on `PATH`. |
| `APP_SERVER_START_FAILED` or `APP_SERVER_EXITED` | Confirm the installed Codex CLI can start and that your environment permits child processes. |
| `APP_SERVER_TIMEOUT` | Retry after checking connectivity; SDK callers can set `timeoutMs` up to 120000. |
| `APP_SERVER_RPC_ERROR` | Update Codex and confirm a compatible ChatGPT-backed sign-in. |
| `APP_SERVER_PROTOCOL_ERROR` or `INVALID_ACCOUNT_USAGE_RESPONSE` | Update both Codex and this package; the upstream response was not safe to normalize. |

The CLI intentionally suppresses raw upstream details. When reporting a bug, include the package version, Codex version, Node.js version, platform, command shape, and error code only.

## Development

```bash
npm test
npm pack --dry-run
```

Maintainers should use the repository's [npm release guide](mydocs/manual/npm_release_guide.md) for release operations; those steps are intentionally kept out of the user guide.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Changes to the public contract need an issue and explicit consumer-impact review.

## Support

Use [GitHub Issues](https://github.com/postmelee/codex-usage-analyzer/issues) for reproducible bugs and focused feature requests. Use GitHub's private vulnerability reporting path for security-sensitive reports.

## License

Copyright (c) postmelee. Released under the [MIT License](LICENSE).

This license covers only this repository's code and documentation. It does not grant rights to OpenAI services, Codex assets, user data, model outputs, trademarks, or third-party content.

This independent project is not affiliated with, endorsed by, or sponsored by OpenAI. OpenAI and Codex names and trademarks belong to their respective owners.
