# codex-usage-analyzer

[![npm package](https://img.shields.io/npm/v/codex-usage-analyzer)](https://www.npmjs.com/package/codex-usage-analyzer)
[![CI](https://github.com/postmelee/codex-usage-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/postmelee/codex-usage-analyzer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Read the account usage shown by Codex through the official app-server protocol, from one small CLI.

`codex-usage-analyzer` starts a compatible Codex process from your installed CLI or macOS app, calls `account/usage/read`, and emits a stable, identity-free contract. It does not scan local sessions or directly read authentication files, tokens, keychains, prompts, or responses.

> **Documented upstream:** This CLI uses OpenAI Codex's documented
> [`account/usage/read`](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
> app-server method.

## Support
Maintained with support from **OpenAI’s [Codex for Open Source](https://developers.openai.com/community/codex-for-oss)** program.
> _Support is provided to the maintainer and does not imply endorsement._

## Quick start

```bash
npx codex-usage-analyzer@latest
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
npx codex-usage-analyzer@latest --json
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

> **Experimental profile:** The `profile` option adds identity, a 52-week token
> activity map, activity insights, and top invocations (most-used skills and
> plugins with usage counts). It uses an unsupported private endpoint and may
> expose private data.
> [Learn more about the experimental profile.](#experimental-profile)

## Why this CLI

- **Account-level source:** use the same app-server method intended for Codex account usage instead of estimating from retained local files.
- **Privacy-first boundary:** receive usage metrics without adding names, usernames, avatars, emails, account identifiers, or credentials to the output.
- **Stable integration:** consume a versioned JSON contract with allowlisted fields and explicit `null` semantics.
- **Small runtime:** use Node.js built-ins and a Codex CLI or compatible macOS app already on your machine; there are no runtime package dependencies.

## Codex lookup benchmark

Lower is faster. This snapshot measured one warm environment on 2026-07-13 with one warm-up and five timed runs.

| Tool | Median | Relative time |
|---|---:|---:|
| `codex-usage-analyzer@0.2.0` | 1.145s | 1.0x |
| `ccusage@20.0.17` | 3.306s | 2.9x |
| `tokscale@4.4.1` | 19.723s | 17.2x |

This compares Codex usage lookup only, not whole products or every workflow they support. The data sources also differ: `codex-usage-analyzer` reads account-level usage through app-server, while the comparison commands scan retained local Codex session history. See the [benchmark methodology, environment, command arrays, and limitations](docs/codex-lookup-benchmark.md).

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
- A recent Codex CLI available as `codex` on `PATH`, or a compatible macOS ChatGPT app or Codex app installed in a standard Applications location
- A ChatGPT-backed Codex sign-in that supports `account/usage/read`

API-key-only and Bedrock authentication do not provide this account usage method. Sign in through Codex before running the analyzer. The package delegates authentication to the selected Codex CLI or app and never asks you to paste a token.

## CLI reference

```text
codex-usage-analyzer - Read your Codex account usage

Usage:
  codex-usage-analyzer [usage] [--json]
  codex-usage-analyzer profile [--json]  (experimental)
  codex-usage-analyzer [usage|profile] --help
  codex-usage-analyzer --version
```

| Command | Output |
|---|---|
| `codex-usage-analyzer` | Human-readable account usage |
| `codex-usage-analyzer usage` | Same human-readable output |
| `codex-usage-analyzer --json` | Account Usage Contract JSON |
| `codex-usage-analyzer usage --json` | Same JSON output |
| `codex-usage-analyzer profile` | Experimental human-readable profile and token activity |
| `codex-usage-analyzer profile --json` | Experimental Full Profile Envelope JSON |
| `codex-usage-analyzer --help` | Help without starting app-server |
| `codex-usage-analyzer --version` | Package version without starting app-server |

Command output is written to stdout. Failures are written to stderr as a stable error code and a safe message, without raw RPC data or app-server stderr. The experimental profile warning is always written to stderr, including successful profile calls. An unavailable private profile still emits an envelope and exits with status `1`; canonical usage remains nested when the official read succeeded.

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

1. Prefer the `codex` executable available on `PATH`.
2. On macOS, fall back to a compatible ChatGPT or Codex app bundle in a standard Applications location.
3. Spawn the selected Codex executable with `app-server`, without a shell.
4. Complete the stable app-server initialization handshake.
5. Call `account/usage/read`.
6. Allowlist and validate the supported fields.
7. Stop the child process and return the normalized document.

The default path has no direct credential reader and no private profile endpoint fallback. Authentication and service communication remain inside the selected Codex process. The explicit experimental `profile` command uses the separate, bounded flow described above and never activates automatically.

## Downstream integrations

Profile sites, README cards, and other services can accept the identity-free JSON contract and combine it with identity they manage separately. The [Downstream Integration Guide](docs/downstream-integration.md) defines recommended field names, ownership, submit-token, validation, rendering, caching, and deletion boundaries.

Do not add identity fields to the account usage document. A downstream service should resolve GitHub identity from its own authenticated account binding, not trust a display name or avatar submitted by this CLI.

Downstreams that explicitly accept the Full Profile Envelope must keep GitHub identity as the ownership proof, treat remote profile identity as cosmetic untrusted input, and opt in separately before storing activity insights.

## Privacy and Security

The default CLI does not directly read or emit:

- access tokens, refresh tokens, cookies, or keychain entries
- names, usernames, avatars, emails, or account identifiers
- prompts, responses, tool input, tool output, or local session files
- local filesystem paths, raw RPC responses, or raw app-server stderr

Treat account usage as private data even though the contract excludes identity. Review a downstream service's retention and visibility policy before submitting output anywhere.

The experimental `profile` command has a different privacy boundary: it can emit identity, an avatar source URL, plan information, activity insights, and invocation names. Inspect its JSON and the downstream privacy policy before storing, publishing, or submitting it.

For vulnerability reporting and supported versions, see [SECURITY.md](SECURITY.md).

## Experimental profile

The default command and `--json` continue to use the documented
[`account/usage/read`](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
method and remain identity-free. The explicit experimental `profile` option
includes the same canonical usage and adds:

- **Profile:** display name, username, avatar information, and plan type
- **Token activity:** a 52-week map derived from canonical daily usage
- **Activity insights:** fast mode share, reasoning effort, skills explored,
  total skill uses, and total threads
- **Top invocations:** most-used skills and plugins with usage counts

> **Experimental and unsupported:** `profile` uses the private
> `/wham/profiles/me` endpoint. It can change or stop working without notice.
> The command prints a warning to stderr and may emit account identity and
> private activity information.

Human-readable output:

```bash
npx codex-usage-analyzer@latest profile
```

```text
Codex profile (experimental)
Status  ok

Profile
Display name  Example Name
Username      @example-user
Avatar        Available
Plan          example-plan

Usage
Codex account usage

Lifetime tokens    1.23B
Peak daily tokens  45.6M
Longest turn       12m 34s
Current streak     3 days
Longest streak     21 days
Daily buckets      4 days

Captured at 2026-07-11T00:00:00.000Z

Token activity
Sun  |....................................................|
Mon  |...................................................:|
Tue  |...................................................*|
Wed  |...................................................O|
Thu  |...................................................#|
Fri  |....................................................|
Sat  |....................................................|
Legend  . 0  : 1  * 2  O 3  # 4

Activity insights
Fast mode         25%
Reasoning effort  high (50%)
Skills explored   6
Total skill uses  42
Total threads     128

Top invocations
$example-skill   9
@example-plugin  4
```

For machine-readable output:

```bash
npx codex-usage-analyzer@latest profile --json
```

```json
{
  "fullProfileContractVersion": 1,
  "kind": "codex-usage-analyzer.fullProfile",
  "stability": "experimental",
  "status": "ok",
  "usage": {
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
        "startDate": "2026-07-06",
        "tokens": 11400000
      },
      {
        "startDate": "2026-07-07",
        "tokens": 22800000
      },
      {
        "startDate": "2026-07-08",
        "tokens": 34200000
      },
      {
        "startDate": "2026-07-09",
        "tokens": 45600000
      }
    ]
  },
  "profile": {
    "displayName": "Example Name",
    "username": "example-user",
    "avatarUrl": "https://example.invalid/avatar.png",
    "planType": "example-plan"
  },
  "activityInsights": {
    "fastModePercent": 25,
    "reasoningEffort": "high",
    "reasoningEffortPercent": 50,
    "skillsExplored": 6,
    "totalSkillsUsed": 42,
    "totalThreads": 128,
    "topInvocations": [
      {
        "type": "skill",
        "name": "example-skill",
        "usageCount": 9
      },
      {
        "type": "plugin",
        "name": "example-plugin",
        "usageCount": 4
      }
    ]
  }
}
```

All values above are synthetic. They do not identify or describe a real account.
The human-readable output suppresses the avatar URL, while JSON consumers receive
the validated source URL and must treat it as untrusted remote input.

The command starts a dedicated app-server session, reads canonical usage through
`account/usage/read`, obtains the minimum ChatGPT auth context from that process,
and performs one fixed HTTPS request. The bearer token and account context stay in
process memory for that request; the CLI does not directly read authentication
files, cookies, or keychains. JavaScript cannot guarantee memory zeroization.

There is no retry, alternate endpoint, Desktop-client impersonation, or silent
fallback from the default command. `profile --json` returns a separate Full
Profile Envelope rather than extending the stable Account Usage Contract or SDK.
See the [Experimental Full Profile Contract](docs/experimental-full-profile.md)
and [JSON Schema](docs/experimental-full-profile.schema.json) before integrating
it or making identity and activity public.

## Troubleshooting

| Error code | What to check |
|---|---|
| `CODEX_NOT_FOUND` | Install or update a Codex CLI on `PATH`, or install a compatible macOS ChatGPT or Codex app in a standard Applications location. |
| `APP_SERVER_START_FAILED` or `APP_SERVER_EXITED` | Confirm the selected Codex CLI or app can start and that your environment permits child processes. |
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
