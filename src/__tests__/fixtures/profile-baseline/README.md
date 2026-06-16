# Profile Baseline Fixture Contract

These fixtures define a synthetic redacted baseline format for Task #6 profile
smoke tests.

The baseline models values that a developer may manually copy from Codex
Desktop profile UI after removing private context. It is not captured from a
real account and must not be treated as real usage.

## Allowed Shape

The fixture uses:

- `schemaVersion`
- `source`
- `capturedProfileAt`
- `profileDateBasis`
- `tolerances`
- `expected`
- `notes`

The `expected` object may contain profile-visible usage fields such as total
tokens, peak daily tokens, token breakdown, streaks, activity insights,
favorite model, skill counts, and top plugin counts.

A comparable expected value is represented as a scalar, array, or simple
object that mirrors the relevant `UsageSnapshot v2` field. A field that should
not be compared can be omitted. A field that is visible in profile UI but known
to come from a different source can use:

```json
{ "status": "not_comparable", "reason": "remote_profile_source_differs" }
```

## Redaction Rules

Do not add real account handles, display names, email addresses, private
filesystem locations, credential-like strings, raw conversation identifiers,
conversation titles, prompts, responses, tool inputs, tool outputs, image
captures, or binary image content to this directory.

The deterministic parser tests should use this fixture to verify comparison
behavior only. Real profile parity checks must use a separate local baseline
file that is not committed.
