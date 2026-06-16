# Empty asset parser fixture

This fixture is synthetic data for Task #5 default built-in pet tests.

It models a Codex home where no custom pet or selected pet state is available.
Codex Desktop falls back to the built-in `codex` pet when no selected avatar id
is persisted. The production analyzer must not fall back to sample fixture
values or wrapper-owned remote profile URLs.

Expected contract:

- `codexAssets.pet` may contain a safe built-in logical reference for the
  default `codex` pet.
- Diagnostics explain that avatar source is not owned by the analyzer and that
  pet selection used the default built-in fallback.
- No local path, data URL, credential, account identifier, or image content is
  emitted.
