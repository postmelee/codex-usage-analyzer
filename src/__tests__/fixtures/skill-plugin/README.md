# Skill/Plugin Parser Fixture Contract

These fixtures are synthetic session JSONL files for Task #4 skill/plugin
ranking tests.

They intentionally model only allowlisted fields needed to distinguish
actual invocation events from catalog/enabled tool metadata:

- `timestamp`
- `type`
- `payload.type`
- `payload.name`
- `payload.status`
- `payload.tool`
- `payload.namespace`
- `payload.dynamic_tools[].name`
- `payload.dynamic_tools[].namespace`
- `payload.dynamic_tools[].deferLoading`

Do not add prompts, responses, tool input/output bodies, cwd values, local
absolute paths, account identifiers, credential-like strings, or real session
ids to this directory.

## Source Contract

The production parser should count only actual invocation events. Catalog
metadata such as `session_meta.payload.dynamic_tools[]` may be used to classify
an actual invocation, but catalog presence alone must not increment usage.

The fixture set is designed to cover:

- catalog-matched skill invocation
- catalog-matched plugin invocation
- dynamic tool request with namespace
- unclassified actual call that must not enter rankings
- deterministic tie-break ordering

The deterministic parser tests should use this fixture root separately from
the core parser fixture root.
