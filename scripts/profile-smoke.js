#!/usr/bin/env node
import {
  compareProfileBaseline,
  formatProfileSmokeSummary,
  loadProfileBaseline,
  loadUsageSnapshot
} from "../src/profile-baseline.js";

const USAGE = [
  "Usage:",
  "  node scripts/profile-smoke.js --baseline <redacted-baseline.json> --snapshot <usage-snapshot.json>",
  "",
  "Compares a redacted Codex Desktop profile baseline with a production UsageSnapshot v2 JSON file.",
  "The command does not print input file paths or raw snapshot JSON."
].join("\n");

const parsed = parseArgs(process.argv.slice(2));

if (parsed.help) {
  process.stdout.write(`${USAGE}\n`);
  process.exitCode = 0;
} else if (!parsed.ok) {
  process.stderr.write(`${USAGE}\n`);
  process.exitCode = 1;
} else {
  try {
    const baseline = loadProfileBaseline(parsed.baseline);
    const snapshot = loadUsageSnapshot(parsed.snapshot);
    const result = compareProfileBaseline(snapshot, baseline);

    process.stdout.write(`${JSON.stringify(formatProfileSmokeSummary(result), null, 2)}\n`);
    process.exitCode = result.status === "ok" ? 0 : 1;
  } catch (error) {
    process.stderr.write(`profile smoke failed: ${getSafeErrorCode(error)}\n`);
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const parsedArgs = {
    baseline: null,
    snapshot: null,
    help: false,
    ok: true
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      parsedArgs.help = true;
      return parsedArgs;
    }

    if (arg === "--baseline") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return { ok: false };
      }

      parsedArgs.baseline = value;
      index += 1;
      continue;
    }

    if (arg === "--snapshot") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return { ok: false };
      }

      parsedArgs.snapshot = value;
      index += 1;
      continue;
    }

    return { ok: false };
  }

  return {
    ...parsedArgs,
    ok: parsedArgs.baseline !== null && parsedArgs.snapshot !== null
  };
}

function getSafeErrorCode(error) {
  if (error && typeof error === "object" && "code" in error) {
    return String(error.code);
  }

  return "unexpected_error";
}
