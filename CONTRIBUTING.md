# Contributing

Contributions to `codex-usage-analyzer` should be small, reviewable, and tied to a concrete user or integration need.

## Before you start

1. Search the [issue tracker](https://github.com/postmelee/codex-usage-analyzer/issues) for an existing task.
2. Open an issue for a bug, feature, public contract change, or structural change before editing source.
3. Wait for a maintainer to confirm the scope. This repository uses an issue-first Hyper-Waterfall workflow, so implementation stages cross explicit approval boundaries.

Security reports do not belong in public issues. Follow [SECURITY.md](SECURITY.md).

## Development requirements

- Node.js 20 or newer
- No runtime dependency additions without prior scope approval
- Synthetic fixtures and fake transports for automated tests

Run the local checks:

```bash
npm test
npm pack --dry-run
```

Automated tests must not require a real account, network access, a local Codex installation, or private credentials. Never commit or paste raw account usage, tokens, account identifiers, prompts, responses, app-server stderr, or machine-specific paths.

## Change guidelines

- Keep the default path on the official app-server `account/usage/read` method.
- Preserve the identity-free output boundary.
- Keep fields allowlisted and validate all upstream values before returning them.
- Update implementation, tests, TypeScript declarations, JSON Schema, and public documentation together when a public surface changes.
- Treat contract shape, meaning, or nullability changes as compatibility work requiring consumer-impact review.
- Keep private or undocumented endpoint experiments out of the default command and package contract.
- Avoid unrelated formatting, dependency, or repository metadata changes.

External contributors normally do not need to edit `mydocs/`; it contains the maintainer's workflow records and manuals. A maintainer will coordinate any required internal documentation.

## Pull requests

A pull request should include:

- the linked issue and approved scope
- a concise behavior summary
- focused tests for success, failure, and privacy boundaries
- commands used for verification
- compatibility or downstream impact, when applicable

Before requesting review, confirm that tests pass, the package dry-run contains only intended artifacts, generated output is absent, and the diff contains no secrets or private data.

## Collaboration

Keep discussion technical and specific. Explain tradeoffs, respond to review findings with code or evidence, and split work when a change becomes broader than its approved issue.
