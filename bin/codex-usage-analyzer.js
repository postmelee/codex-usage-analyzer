#!/usr/bin/env node
import { runCli } from "../src/cli.js";

try {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
} catch {
  process.stderr.write(
    "codex-usage-analyzer: Unexpected failure. [UNEXPECTED_ERROR]\n"
  );
  process.exitCode = 1;
}
