# Parser Fixture Contract

These fixtures are synthetic session JSONL files for Task #3 parser tests.
Task #4 skill/plugin invocation tests use a separate fixture root at
`src/__tests__/fixtures/skill-plugin/` so the core usage/model/activity
regression counts in this directory stay stable.

They intentionally model only the allowlisted fields that the production parser may aggregate:

- `timestamp`
- `type`
- `payload.type`
- `payload.model`
- `payload.model_name`
- `payload.model_info.slug`
- `payload.effort`
- `payload.mode`
- `payload.duration_ms`
- `payload.last_token_usage`
- `payload.total_token_usage`
- `payload.info.last_token_usage`
- `payload.info.total_token_usage`

Do not add prompts, responses, cwd values, local absolute paths, account identifiers, credential-like strings, or real session ids to this directory.

## Expected Aggregate Shape

The fixture set is designed to cover:

- normal `token_count` aggregation
- missing optional token breakdown fields
- malformed JSONL line handling
- unknown event ignoring
- multi-day daily buckets
- multi-model ranking
- model-bearing `turn_context` followed by model-less `token_count`
- effort and fast-mode distribution candidates

The deterministic parser tests should use a fixed `capturedAt` or `now` value instead of wall-clock time.
