# Unsafe asset parser fixture

This fixture is synthetic data for Task #5 unsafe asset source tests.

It models a Codex home where generated image artifacts exist, but no custom
pet source is present. Generated images can contain private user content, so
they must not be promoted to `codexAssets` by the default analyzer path.

Expected contract:

- `generated_images/` entries are counted only as excluded or unsafe candidates.
- Generated image candidates do not produce `codexAssets.avatar` or custom
  `codexAssets.pet`.
- `codexAssets.pet` may still use the built-in `codex` fallback because that
  source is independent of `generated_images/`.
- Diagnostics may expose counts and reason codes, but not paths, file names,
  image content, data URLs, or account identifiers.
