# Experimental Full Profile Contract

The Full Profile Envelope is an opt-in, CLI-only contract for identity and
activity fields shown by Codex. It combines one stable, identity-free Account
Usage Contract document with allowlisted fields from an unsupported private
profile endpoint.

This contract is experimental. It is not part of the public JavaScript SDK and
does not change the default command or the stable
[`account/usage/read`](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
path. The machine-readable source of truth is
[`experimental-full-profile.schema.json`](experimental-full-profile.schema.json).

## CLI

```bash
codex-usage-analyzer profile
codex-usage-analyzer profile --json
```

`profile` prints a human-readable view. `profile --json` prints exactly one Full
Profile Envelope to stdout. Both commands first write this warning to stderr:

```text
codex-usage-analyzer: Warning: profile uses an unsupported experimental endpoint and may expose account identity fields.
```

`profile --help` and `profile -h` do not start app-server or make a network
request. There is no environment variable, configuration file, implicit mode,
or fallback that enables the experiment without the `profile` command token.

## Envelope

```json
{
  "fullProfileContractVersion": 1,
  "kind": "codex-usage-analyzer.fullProfile",
  "stability": "experimental",
  "status": "ok",
  "usage": {
    "contractVersion": 1,
    "capturedAt": "2026-01-01T00:00:00.000Z",
    "summary": {
      "lifetimeTokens": 1000,
      "peakDailyTokens": 200,
      "longestRunningTurnSec": 300,
      "currentStreakDays": 4,
      "longestStreakDays": 5
    },
    "dailyUsageBuckets": [
      {
        "startDate": "2025-12-31",
        "tokens": 100
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
    "reasoningEffort": "example-effort",
    "reasoningEffortPercent": 50,
    "skillsExplored": 6,
    "totalSkillsUsed": 7,
    "totalThreads": 8,
    "topInvocations": [
      {
        "type": "skill",
        "name": "example-skill",
        "usageCount": 9
      }
    ]
  }
}
```

All values are synthetic. They do not identify or describe a real account.
Every object rejects unknown fields under the JSON Schema.

## Root fields

| Field | Type | Meaning |
|---|---|---|
| `fullProfileContractVersion` | integer, constant `1` | Version of this experimental envelope |
| `kind` | string, constant `codex-usage-analyzer.fullProfile` | Contract discriminator |
| `stability` | string, constant `experimental` | Explicit stability classification |
| `status` | `ok`, `partial`, or `unavailable` | Completeness of private profile categories |
| `usage` | Account Usage Contract v1 | Canonical usage from official app-server data |
| `profile` | object or `null` | Allowlisted identity and plan projection |
| `activityInsights` | object or `null` | Allowlisted private activity projection |

The envelope has no separate observation timestamp. `usage.capturedAt` is the
canonical time at which the official usage result was received.

## Canonical usage

`usage` is reconstructed only from the documented app-server
`account/usage/read` result and follows the stable
[Account Usage Contract](account-usage-contract.md). Private profile stats are
never copied into `usage`, even when they contain similarly named totals,
streaks, durations, or daily buckets.

Downstreams must use nested `usage` as the only canonical source for tokens,
streaks, turn duration, and token activity. They must not replace it with values
from identity or activity categories.

## Profile fields

When `profile` is an object, all fields are present. Each value is a bounded
string or `null`.

| Field | Meaning |
|---|---|
| `displayName` | Cosmetic display name reported by the private profile source |
| `username` | Cosmetic username reported by the private profile source |
| `avatarUrl` | Validated absolute HTTPS source URL; never fetched by this CLI |
| `planType` | Plan category from app-server account metadata when available |

These values are identity data, but they are not account ownership proof. The
human renderer never prints the avatar URL; it prints only `Available` or
`Unavailable`. JSON consumers receive the validated URL and must still treat it
as untrusted remote input.

## Activity insight fields

When `activityInsights` is an object, all fields are present.

| Field | Type | Meaning |
|---|---|---|
| `fastModePercent` | integer 0-100 or `null` | Share using fast mode, rounded to the whole-percent UI value |
| `reasoningEffort` | string or `null` | Most-used reasoning effort label |
| `reasoningEffortPercent` | integer 0-100 or `null` | Share for that effort, rounded to the whole-percent UI value |
| `skillsExplored` | non-negative safe integer or `null` | Distinct skills reported by the private source |
| `totalSkillsUsed` | non-negative safe integer or `null` | Total skill uses reported by the private source |
| `totalThreads` | non-negative safe integer or `null` | Total threads reported by the private source |
| `topInvocations` | array or `null` | Allowlisted plugin or skill invocation rows |

Each invocation contains only `type`, `name`, and `usageCount`. `type` is
`plugin` or `skill`; ids and unknown metadata are discarded. Invocation names
can reveal workflow details and must be treated as private unless a user opts in
to storage or publication.

## Status and exit code

| Condition | `status` | Profile/activity | Exit code |
|---|---|---|---:|
| Private root and required categories are structurally complete | `ok` | Allowlisted objects | 0 |
| Private root exists but a category or field is missing, invalid, or reports a stats error | `partial` | Fixed objects with unavailable values as `null` | 0 |
| Auth context, HTTP, body, or private root validation fails | `unavailable` | Both categories are `null` | 1 |
| Official `account/usage/read` fails | No envelope | Safe error on stderr | 1 |

An unavailable private profile does not turn private stats into a fallback usage
source. When the official read succeeded, its canonical `usage` remains in the
`unavailable` envelope.

## Null and empty values

- `null` means a field or category is unavailable. It never means zero.
- `profile: null` and `activityInsights: null` identify an unavailable private
  profile root or request.
- A present profile or activity object keeps its complete field set; unavailable
  members are `null`.
- `topInvocations: null` means the source category was unavailable.
- `topInvocations: []` means the category was available but had no accepted rows.
- `usage.dailyUsageBuckets` retains the stable contract's separate `null`, `[]`,
  and populated-array meanings.

## Human token activity

The human renderer builds its token activity map only from
`usage.dailyUsageBuckets`:

- UTC date-only values with no timezone rebucketing
- Sunday-start weeks ending with the week containing `usage.capturedAt`
- at most 52 weeks, with future dates in the current week left blank
- relative ASCII intensity levels `0` through `4`
- duplicate dates summed with safe-integer saturation
- `Unavailable` for `null` and `No activity recorded` for an empty array

The map is presentation only and is not an additional contract field.

## Security boundary

The profile flow is isolated from the default usage client:

1. Resolve the installed Codex executable and start one dedicated app-server
   child without a shell.
2. Read official usage, official account metadata, and the minimum internal auth
   context in that child session.
3. Accept only a bounded compact bearer token and one bounded ChatGPT account
   claim needed for the fixed request.
4. Send one GET request to the fixed ChatGPT HTTPS profile endpoint with redirects
   disabled, ambient credentials omitted, no retry, a timeout, a 1 MiB response
   limit, strict UTF-8, JSON content-type, and object-root validation.
5. Reconstruct the output from an allowlist and discard raw response categories.

Bearer and account context references exist only in process memory for the
request. They are never returned, logged, written to a file, or passed to the
normalizer. JavaScript memory zeroization is not guaranteed, so the implementation
minimizes reference and child-process lifetime instead of claiming erasure.

The CLI does not directly read authentication files, cookies, keychains, prompts,
responses, or local sessions. It discards app-server stderr and raw RPC/HTTP error
details. It uses an honest package originator and User-Agent; it does not imitate
a Desktop client if the endpoint rejects the request.

## Unsupported endpoint and drift

The private `/wham/profiles/me` endpoint and the internal auth method have no
documented stability contract. Authentication requirements, response fields, or
endpoint availability can change independently of this package. The safe response
to drift is `partial`, `unavailable`, or a safe error, not a hidden alternate
endpoint or private-stat fallback.

Consumers must check `fullProfileContractVersion`, `kind`, `stability`, and
`status` on every envelope. A future incompatible envelope change requires a new
full-profile contract version and consumer-impact review; it does not imply a
change to Account Usage Contract v1.

## Downstream use

The default downstream design remains an identity-free usage submission combined
with a separately authenticated GitHub identity. A service that also accepts this
experimental envelope must:

- require a separate explicit opt-in and keep the feature non-public by default
- validate the Full Profile Schema and reject unknown versions or fields
- use GitHub identity, not remote profile strings, for ownership and authorization
- trust only nested official `usage` for canonical metrics
- apply a separate privacy policy before retaining activity insights or invocation
  names
- validate, decode, safely re-encode, and re-host an allowed avatar instead of
  exposing the source URL
- never accept Codex/OpenAI credentials and never log raw profile payloads

See the [Downstream Integration Guide](downstream-integration.md) for the complete
submission, identity, rendering, cache, revocation, and deletion boundary.
