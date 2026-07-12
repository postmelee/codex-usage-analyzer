# Codex Usage Lookup Benchmark

This document records a reproducible snapshot of the time required for three CLI commands to return Codex usage data. It compares this narrow lookup workflow only. It is not a whole-product comparison, an accuracy ranking, or a general performance guarantee.

The snapshot was captured on 2026-07-13 during issue scoping with the same warm-up, repetition, sequential execution, and output-suppression policy now encoded by [`measure-command.mjs`](../scripts/benchmarks/measure-command.mjs). A new run will vary with the machine, retained history, filesystem cache, network, and upstream service state.

## Results

Lower is faster.

| Tool | Usage source for this command | Median | Min-max | Relative time |
|---|---|---:|---:|---:|
| `codex-usage-analyzer@0.2.0` | Codex app-server account usage | 1.145s | 0.800-1.222s | 1.0x |
| `ccusage@20.0.17` | Retained local Codex sessions | 3.306s | 3.252-3.329s | 2.9x |
| `tokscale@4.4.1` | Retained local Codex sessions | 19.723s | 19.440-20.328s | 17.2x |

Relative time is each median divided by the `codex-usage-analyzer` median and rounded to one decimal place. The table does not compare provider coverage, feature sets, security, presentation, or the correctness of differently sourced values.

## Method

- Install exact package versions in an isolated temporary directory. Installation time is excluded.
- Verify npm registry signatures, then run the installed package binaries without package-runner startup or download time.
- Run commands sequentially on the same machine.
- Run one warm-up invocation, followed by five measured invocations.
- Measure wall-clock time from child process start through exit with a monotonic clock.
- Discard child stdout. Do not retain stderr content; count bytes only.
- Do not record usage values, session content, filenames, account identity, credentials, or private filesystem paths.
- Keep pricing network access out of the local scanners: use ccusage offline mode and Tokscale's pricing-cache-only environment setting.

The original snapshot used an equivalent temporary timing script. The repository harness codifies the method for later runs and reports `median`, `mean`, `min`, and `max`; it does not make the recorded snapshot immutable or automatically install comparison packages.

## Environment

| Item | Recorded value |
|---|---|
| Date | 2026-07-13 |
| Architecture | arm64 |
| Operating system | macOS 26.5.2 |
| Node.js | 24.15.0 |
| Codex CLI | 0.144.0-alpha.4 |
| Retained history | 1,000-4,999 JSONL files; 2 GiB or more |
| Warm-up | 1 run per command |
| Measured runs | 5 runs per command |

Retained history is deliberately reported as a coarse bucket. The benchmark record contains no user home, temporary directory, session filename, account identifier, or usage metric.

## Command arrays

The executable and argument arrays below describe the measured lookup work. The benchmark runner invokes them with `shell: false`; metacharacters are not interpreted by a child shell.

### codex-usage-analyzer 0.2.0

```json
{
  "command": "codex-usage-analyzer",
  "args": ["--json"]
}
```

This command starts the installed Codex CLI and calls OpenAI Codex's documented [`account/usage/read`](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md) app-server method.

### ccusage 20.0.17

```json
{
  "command": "ccusage",
  "args": ["codex", "daily", "--offline", "--json"]
}
```

The command shape and offline option are documented in the official [`ccusage` v20.0.17 source](https://github.com/ccusage/ccusage/tree/v20.0.17).

### Tokscale 4.4.1

```json
{
  "env": {
    "TOKSCALE_PRICING_CACHE_ONLY": "1"
  },
  "command": "tokscale",
  "args": ["--client", "codex", "--json", "--no-spinner"]
}
```

The client filter, JSON mode, and pricing-cache-only behavior are defined in the official [`tokscale` v4.4.1 source](https://github.com/junhoyeo/tokscale/tree/v4.4.1).

## Reproduction

Install and signature-check the exact packages in an isolated directory according to your own dependency-review policy. Put that directory's `node_modules/.bin` on `PATH`, then run the repository harness once per command:

```bash
node scripts/benchmarks/measure-command.mjs --warmup 1 --runs 5 -- codex-usage-analyzer --json
node scripts/benchmarks/measure-command.mjs --warmup 1 --runs 5 -- ccusage codex daily --offline --json
TOKSCALE_PRICING_CACHE_ONLY=1 node scripts/benchmarks/measure-command.mjs --warmup 1 --runs 5 -- tokscale --client codex --json --no-spinner
```

The harness output contains aggregate timing and an stderr byte count. It does not contain the child command, arguments, stdout, stderr content, environment, or local paths.

## Interpretation limits

The commands do not read the same source:

- `codex-usage-analyzer` delegates authentication and remote communication to the installed Codex process and reads account-level data through the documented app-server method.
- The compared ccusage and Tokscale commands parse retained local Codex session history for their reports.

Remote lookup time can change with network latency, Codex startup, authentication state, and service health. Local scan time can change with retained history size, file layout, parser behavior, filesystem performance, and cache warmth. A local scan may also cover a different time range from account-level data.

For those reasons, use this result only as a dated observation of Codex usage lookup latency in the recorded environment. Re-run the benchmark before making a current performance claim, and do not use this table as a substitute for evaluating data semantics or product requirements.
