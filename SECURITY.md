# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| Latest published npm release | Yes |
| `main` | Development branch; not a supported release |
| Older npm releases | No |

Security fixes are released on the latest package line. Users should update to the newest published version before reporting an issue that may already be fixed.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/postmelee/codex-usage-analyzer/security/advisories/new) so maintainers can investigate without exposing users.

If private reporting is unavailable, open a minimal public issue asking for a secure contact channel. Do not include exploit details or sensitive data in that issue.

Include only the information needed to reproduce the security boundary:

- affected package and Codex CLI versions
- Node.js version and operating system
- command shape and safe error code
- impact and minimal reproduction using synthetic data
- whether the issue affects command execution, response validation, logging, persistence, or package integrity

Never submit authentication tokens, cookies, account identifiers, raw account usage, raw app-server responses or stderr, prompts, responses, local filesystem paths, private repository links, or private keys.

## Security scope

Reports are especially useful when they involve:

- unexpected command or shell execution
- credential, account identifier, or private data exposure
- unsafe handling of app-server protocol messages
- validation bypass in the public contract
- sensitive information written to stdout, stderr, logs, or package artifacts
- npm package, dependency, workflow, or trusted-publishing supply-chain risk

The CLI intentionally delegates sign-in to the installed Codex process. It does not directly read authentication files or keychains and does not accept pasted OpenAI credentials. A downstream service that accepts this package's output has its own authentication, storage, rendering, visibility, retention, and deletion responsibilities.

## Disclosure

Please allow maintainers to confirm the issue and prepare a fix before public disclosure. The project will credit reporters when requested and appropriate, but it does not promise a fixed response or remediation timeline.
