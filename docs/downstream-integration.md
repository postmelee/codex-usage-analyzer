# Downstream Integration Guide

This guide defines the boundary between `codex-usage-analyzer` and a service that stores account usage or renders a profile card.

The CLI owns one artifact: the identity-free [Account Usage Contract](account-usage-contract.md). A downstream service owns identity, authorization, submission, persistence, rendering, cache behavior, privacy controls, and deletion.

## Recommended architecture

```text
Codex app-server
      |
      v
codex-usage-analyzer --json
      |
      | identity-free usage document
      v
downstream submit API ---- GitHub account binding
      |
      +---- validated usage storage
      +---- sanitized identity projection
      +---- stable card/image endpoint
```

Do not extend the CLI document with downstream fields. Keep the usage contract reusable and combine identity only after the downstream has authenticated the submitter.

## Responsibility boundary

| Concern | CLI | Downstream |
|---|---|---|
| Read account usage | Call the official app-server method | Never request Codex credentials |
| Normalize usage | Emit contract-versioned allowlisted fields | Validate the complete contract before accepting it |
| GitHub identity | None | Authenticate and bind a stable GitHub user id |
| submit token | None | Issue, hash, rotate, revoke, and rate-limit its own token |
| Storage | None | Store only the minimum usage and identity projection needed |
| Card rendering | None | Format values, localize labels, and render the image |
| HTTP cache | None | Define freshness, validators, and revision behavior |
| Privacy and delete controls | None | Explain visibility and retention; provide revoke and delete paths |

## GitHub identity

Use the downstream's GitHub OAuth or GitHub App session as the account ownership proof. Bind records to GitHub's stable numeric user id, not to a mutable login or display name.

Recommended normalized fields inside the downstream only:

```json
{
  "provider": "github",
  "providerUserId": "12345678",
  "username": "octocat",
  "displayName": "The Octocat",
  "avatarUrl": "https://avatars.githubusercontent.com/u/12345678?v=4"
}
```

The values are illustrative. Map GitHub `login` to `username`, use `name` for `displayName` when present, and fall back to `login` when it is absent. Map `avatar_url` to `avatarUrl` only after validating the response from GitHub.

Never trust identity fields supplied beside a CLI upload. A user who can submit usage must not be able to overwrite another account's name, username, avatar, ownership id, or public URL.

## Submit authentication

Issue a narrow downstream submit token after GitHub account binding. The token should authorize only usage updates for one bound downstream account.

- Do not accept an OpenAI, Codex, GitHub, npm, or operating-system credential as a submit token.
- Show the token only at creation, store only a slow or cryptographic hash as appropriate, and support rotation and immediate revocation.
- Keep the token out of command arguments, URLs, image URLs, logs, analytics, and error bodies.
- Prefer stdin, an environment variable, or an operating-system secret store in the downstream client.
- Apply per-account and per-token rate limits and record security events without recording payload values.

The base CLI does not define a submit command or token field. A downstream-specific wrapper should own that interface.

## Suggested submit API

The following protocol is non-normative. It illustrates a boundary that does not mix identity with usage.

```http
POST /v1/account-usage
Authorization: Bearer <downstream-issued-submit-token>
Content-Type: application/json
```

The request body is exactly one Account Usage Contract document:

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
  "dailyUsageBuckets": []
}
```

All values are synthetic. A successful response can return opaque downstream metadata:

```json
{
  "status": "accepted",
  "revision": "opaque-revision",
  "imageUrl": "https://example.invalid/u/octocat/codex-usage.png"
}
```

Do not copy `revision` or `imageUrl` into the account usage document.

## Validation and storage

Before storing a submission:

1. Authenticate and rate-limit the downstream submit token.
2. Enforce request content type and a conservative body-size limit.
3. Validate the JSON Schema and reject unknown `contractVersion` values.
4. Reject extra fields, unsafe integers, invalid dates, and future `capturedAt` values beyond a small clock-skew allowance.
5. Reject stale or replayed updates according to an explicit policy.
6. Bind the write to the token's account, never to a body-supplied username.

Store only fields needed to render the product. Separate usage data from credential records, encrypt sensitive stores at rest, limit operator access, and define a retention period. Logs should contain request ids, result codes, timings, contract version, and coarse byte counts, not account usage values or identity payloads.

Preserve null semantics:

- `null` means unavailable and must not be displayed as zero.
- `[]` means daily data was available but contained no rows.
- Daily `startDate` values are source dates and must not be timezone-rebucketed.

## Rendering and cache behavior

The downstream owns all presentation decisions, including number formatting, localization, missing-value labels, heatmap color thresholds, and avatar treatment.

For a README image endpoint:

- Keep one stable HTTPS image URL per public profile.
- Return an actual image content type and deterministic bytes for a stored revision.
- Send `ETag` and `Last-Modified` validators and a deliberate `Cache-Control` policy that permits revalidation.
- Update the validator when a new submission changes rendered content.
- Keep immutable, revision-addressed assets internally so rendering can be retried and rolled back.
- Expect GitHub's image proxy to introduce cache delay; do not promise immediate refresh after submit.
- Do not include submit tokens, account ids, private revisions, or sensitive query parameters in the public image URL.

Fetch remote avatars server-side only with strict HTTPS host policy, redirect limits, response-size limits, image decoding, and content-type verification. Re-encode to a safe image format before storage or rendering. This prevents browser tracking and reduces server-side request forgery and image parser risk.

## Privacy, revocation, and deletion

Before a profile becomes public, explain exactly which identity and usage fields will be visible. Default new profiles to private unless the product intentionally and clearly asks for public visibility.

Provide controls to:

- revoke every submit token
- disable the public card without deleting the account
- delete stored usage, rendered assets, and the downstream identity binding
- export or inspect the stored fields when required by the product's policy

Deletion should invalidate caches where possible and make the stable image URL return a non-sensitive tombstone or `404`. Document backup-retention limits and avoid retaining deleted data indefinitely.

## Experimental profile identity

A future adapter for private or undocumented profile endpoints such as `/wham/profiles/me` must remain separate from the default CLI and its contract. It is not implemented by `codex-usage-analyzer`.

If a downstream chooses to experiment with such an adapter:

- require explicit opt-in for every invocation
- label the source unstable and unsupported
- never silently fall back to it
- never use its identity as authentication, authorization, or account ownership proof
- allowlist only cosmetic fields and discard usage metrics from that response
- never persist or log raw responses, credentials, account identifiers, or private URLs
- sanitize and re-host an avatar instead of exposing a raw remote URL to viewers
- make failure non-fatal to the official account usage path

A separate downstream-owned envelope may use these field names:

```json
{
  "experimentalProfile": {
    "source": "codex-private-profile",
    "displayName": "Example Name",
    "username": "example",
    "avatarUrl": "https://example.invalid/avatar-source",
    "observedAt": "2026-07-11T00:00:00.000Z"
  }
}
```

This envelope is not part of the Account Usage Contract. GitHub identity should remain the default display source and the only account binding unless a later, separately reviewed design establishes another verifiable identity source.

Keep the experimental envelope authenticated and non-public. Treat `avatarUrl` as untrusted adapter input and replace it with a sanitized downstream asset before rendering or storage.

## Versioning

Accept only contract versions the downstream explicitly supports. A new root field, changed field meaning, changed nullability, or changed date semantics requires a new contract version and coordinated rollout.

Deploy downstream read support before emitting a new version. Keep old readers and stored records isolated by `contractVersion`, and do not reinterpret old data under new semantics.
