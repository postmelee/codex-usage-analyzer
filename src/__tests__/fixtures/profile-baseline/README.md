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
- `sourcePolicy`
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

When a field should still be compared but the expected difference is likely
caused by remote/local source differences, use top-level `sourcePolicy`:

```json
{
  "sourcePolicy": {
    "activity.totalThreads": "source_mismatch",
    "skills.topSkills": "source_mismatch",
    "plugins.topPlugins": "source_mismatch"
  }
}
```

`sourcePolicy` values are limited to:

- `source_mismatch`
- `profile_parity_not_guaranteed`
- `remote_profile_source_differs`

Use `not_comparable` when the field should not be compared at all. Use
`sourcePolicy` when the field should remain comparable, but the result reason
should show that remote profile source and local session source differ.

This metadata belongs to the redacted baseline only. It is not part of
`UsageSnapshot v2` and does not change analyzer output.

## Redaction Rules

Do not add real account handles, display names, email addresses, private
filesystem locations, credential-like strings, raw conversation identifiers,
conversation titles, prompts, responses, tool inputs, tool outputs, image
captures, or binary image content to this directory.

The deterministic parser tests should use this fixture to verify comparison
behavior only. Real profile parity checks must use a separate local baseline
file that is not committed.
