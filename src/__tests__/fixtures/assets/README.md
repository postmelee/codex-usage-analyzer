# Asset parser fixture

This fixture is synthetic data for Task #5 asset source tests.

It models a Codex home where a selected custom pet exists under `pets/`.
Codex Desktop custom pets are directory-based assets with a `pet.json` manifest
and a spritesheet file. The spritesheet fixture is a text placeholder on
purpose: the analyzer must not read image binary content in the default parser
path. The parser should use only manifest metadata, directory metadata,
extension allowlists, and safe logical references.

Expected contract:

- `pets/<id>/pet.json` is the allowlisted custom pet manifest source.
- A selected safe custom pet may produce `kind: "codex-asset"`, `url: null`,
  and the opaque `assetRef` `codex-local:pet:custom-selected`.
- The emitted `assetRef` and diagnostics must not contain an absolute path,
  custom pet directory name, manifest file name, or spritesheet file name.
- No avatar should be inferred from this fixture.
- No remote profile image URL, GitHub avatar, data URL, prompt, response,
  credential, or account identifier is present.
