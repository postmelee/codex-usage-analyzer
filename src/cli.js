import {
  analyzeUsage,
  createSampleUsageSnapshotV2
} from "./analyze.js";

const USAGE = [
  "Usage:",
  "  codex-usage-analyzer analyze --json",
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

  const hasJsonFlag = flags.includes("--json");
  const hasFixtureSampleFlag = flags.includes("--fixture-sample");
  const unknownFlags = flags.filter((flag) => {
    return flag !== "--json" && flag !== "--fixture-sample";
  });

  if (!hasJsonFlag || unknownFlags.length > 0) {
    stderr.write(`${USAGE}\n`);
    return 1;
  }

  const snapshot = hasFixtureSampleFlag
    ? createSampleUsageSnapshotV2()
    : await analyzeUsage();
  stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
  return 0;
}
