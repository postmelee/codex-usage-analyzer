# Empty asset parser fixture

This fixture is synthetic data for Task #5 unavailable asset tests.

It models a Codex home where no allowlisted avatar or pet asset source is
available. The production analyzer must not fall back to sample fixture values
or wrapper-owned remote profile URLs.

Expected contract:

- `codexAssets` remains omitted or unavailable when no safe local source exists.
- Diagnostics explain that avatar and pet sources were not found or are not
  owned by the analyzer.
- No local path, data URL, credential, account identifier, or image content is
  emitted.
