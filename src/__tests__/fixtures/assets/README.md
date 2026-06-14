# Asset parser fixture

This fixture is synthetic data for Task #5 asset source tests.

It models a Codex home where a local pet asset candidate exists under
`pets/`. The candidate file is a text placeholder with a `.png` extension on
purpose: the analyzer must not read image binary content in the default parser
path. Stage 2 should use only directory metadata, extension allowlists, and
safe logical references.

Expected contract:

- `pets/` is an allowlisted local pet source candidate.
- A safe pet candidate may produce `kind: "codex-asset"`, `url: null`, and an
  opaque `assetRef`.
- The emitted `assetRef` must not contain an absolute path or this fixture file
  name.
- No avatar should be inferred from this fixture.
- No remote profile image URL, GitHub avatar, data URL, prompt, response,
  credential, or account identifier is present.
