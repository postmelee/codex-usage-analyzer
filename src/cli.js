import {
  analyzeUsage,
  createSampleUsageSnapshotV2
} from "./analyze.js";

const USAGE = [
  "Usage:",
  "  codex-usage-analyzer analyze --json [--codex-home <path>]",
  "  codex-usage-analyzer analyze --json --fixture-sample"
].join("\n");

export async function runCli(argv, io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;

  if (argv.includes("--help") || argv.includes("-h")) {
    stdout.write(`${USAGE}\n`);
    return 0;
  }

  const [command, ...flags] = argv;

  if (command !== "analyze") {
    stderr.write(`${USAGE}\n`);
    return 1;
  }

  const parsedFlags = parseAnalyzeFlags(flags);
  if (!parsedFlags.ok) {
    stderr.write(`${USAGE}\n`);
    return 1;
  }

  const snapshot = parsedFlags.fixtureSample
    ? createSampleUsageSnapshotV2()
    : await analyzeUsage({
      codexHome: parsedFlags.codexHome
    });
  stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
  return 0;
}

function parseAnalyzeFlags(flags) {
  const parsed = {
    codexHome: null,
    fixtureSample: false,
    hasJson: false,
    ok: true
  };

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];

    if (flag === "--json") {
      parsed.hasJson = true;
    } else if (flag === "--fixture-sample") {
      parsed.fixtureSample = true;
    } else if (flag === "--codex-home") {
      const value = flags[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return { ok: false };
      }

      parsed.codexHome = value;
      index += 1;
    } else {
      return { ok: false };
    }
  }

  return {
    ...parsed,
    ok: parsed.hasJson
  };
}
