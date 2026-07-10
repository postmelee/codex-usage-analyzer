# Account Usage Contract

`codex-usage-analyzer --json` and the JavaScript `readAccountUsage()` API return the same Account Usage Contract. The current contract version is `1`.

The contract is a minimal, stable projection of the official Codex app-server `account/usage/read` result. It never includes a name, username, avatar, email, account identifier, or authentication material.

The machine-readable source of truth is [`account-usage.schema.json`](account-usage.schema.json).

## Shape

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

All example values are synthetic and do not represent a real account.

## Root fields

| Field | Type | Meaning |
|---|---|---|
| `contractVersion` | integer, constant `1` | Version of this downstream contract |
| `capturedAt` | ISO 8601 UTC string | Time at which the app-server response was received |
| `summary` | object | Account-level token and activity summary |
| `dailyUsageBuckets` | array or `null` | Daily token buckets; `null` means unavailable upstream |

## Summary fields

Every summary field is always present. Each value is either a non-negative safe integer or `null`.

| Field | Meaning |
|---|---|
| `lifetimeTokens` | Lifetime token usage |
| `peakDailyTokens` | Highest token usage reported for one day |
| `longestRunningTurnSec` | Longest-running turn duration, in seconds |
| `currentStreakDays` | Current activity streak, in days |
| `longestStreakDays` | Longest activity streak, in days |

When the upstream method omits a metric or returns `null`, the wrapper preserves `null`. Downstream consumers must treat `null` as unavailable, not zero.

## Daily buckets

- `dailyUsageBuckets: null` means the upstream method did not provide buckets.
- `dailyUsageBuckets: []` means the bucket source was present but contained no rows.
- Each row contains only `startDate` and `tokens`.
- `startDate` is a `YYYY-MM-DD` date-only string. Consumers must preserve it as the source date instead of applying timezone rebucketing.
- `tokens` is a non-negative safe integer.

## Forward compatibility

The wrapper emits allowlisted fields only. New fields added by app-server do not automatically enter contract version 1. Changing an existing field's meaning, nullability, or root shape requires a new contract version and a consumer-impact review.

Version 1 objects reject unknown fields because `additionalProperties` is false throughout the schema. Validate `contractVersion` before accepting a document and reject unsupported versions explicitly.

## Privacy boundary

The contract excludes:

- display name, username, avatar, email, and account identifier
- access or refresh tokens, cookies, and credential paths
- local Codex session content and local filesystem paths
- raw app-server responses, stderr, and RPC error messages

Identity, submit tokens, storage, card rendering, cache policy, and deletion belong to the downstream service. See the [Downstream Integration Guide](downstream-integration.md).

## Upstream

- [OpenAI Codex App Server](https://developers.openai.com/codex/app-server)
- Method: `account/usage/read`
- API-key-only and Bedrock authentication are not supported by this method.
