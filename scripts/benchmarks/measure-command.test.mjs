import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  parseArgs,
  runBenchmark,
  summarizeDurations
} from "./measure-command.mjs";

const scriptPath = fileURLToPath(new URL("./measure-command.mjs", import.meta.url));

test("summarizes odd and even duration samples with millisecond rounding", () => {
  assert.deepEqual(summarizeDurations([4, 1, 2.0004]), {
    median: 2,
    mean: 2.333,
    min: 1,
    max: 4
  });
  assert.deepEqual(summarizeDurations([4, 1, 3, 2]), {
    median: 2.5,
    mean: 2.5,
    min: 1,
    max: 4
  });
});

test("rejects missing, duplicate, and invalid benchmark arguments", () => {
  const invalidArgv = [
    [],
    ["node"],
    ["--"],
    ["--runs", "0", "--", "node"],
    ["--warmup", "-1", "--", "node"],
    ["--runs", "1.5", "--", "node"],
    ["--runs", "1", "--runs", "2", "--", "node"],
    ["--unknown", "1", "--", "node"]
  ];

  for (const argv of invalidArgv) {
    assert.throws(() => parseArgs(argv));
  }
});

test("parses command arguments literally after the separator", () => {
  assert.deepEqual(
    parseArgs([
      "--warmup",
      "0",
      "--runs",
      "2",
      "--",
      "synthetic command",
      "space value",
      "$HOME;echo not-a-shell"
    ]),
    {
      warmupRuns: 0,
      measuredRuns: 2,
      command: "synthetic command",
      commandArgs: ["space value", "$HOME;echo not-a-shell"]
    }
  );
});

test("excludes warm-up runs and aggregates measured stderr bytes", async () => {
  const calls = [];
  const measuredDurations = [4, 2, 3];

  const result = await runBenchmark({
    command: "synthetic",
    commandArgs: ["literal"],
    warmupRuns: 2,
    measuredRuns: 3,
    async executeCommand(call) {
      calls.push(call);

      if (call.phase === "warmup") {
        return { durationMs: 1_000, stderrBytes: 100 };
      }

      return {
        durationMs: measuredDurations[call.runIndex - 1],
        stderrBytes: call.runIndex
      };
    }
  });

  assert.deepEqual(
    calls.map(({ phase, runIndex }) => ({ phase, runIndex })),
    [
      { phase: "warmup", runIndex: 1 },
      { phase: "warmup", runIndex: 2 },
      { phase: "measured", runIndex: 1 },
      { phase: "measured", runIndex: 2 },
      { phase: "measured", runIndex: 3 }
    ]
  );
  assert.deepEqual(result, {
    warmupRuns: 2,
    measuredRuns: 3,
    durationMs: { median: 3, mean: 3, min: 2, max: 4 },
    stderrBytes: 6
  });
});

test("passes shell metacharacters literally and suppresses child output", () => {
  const stdoutSentinel = "synthetic-stdout-sentinel";
  const stderrSentinel = "synthetic-stderr-sentinel";
  const literalArguments = ["space value", "$HOME;echo not-a-shell"];
  const childSource = [
    `const expected = ${JSON.stringify(literalArguments)};`,
    "const actual = process.argv.slice(1);",
    "if (JSON.stringify(actual) !== JSON.stringify(expected)) process.exit(9);",
    `process.stdout.write(${JSON.stringify(stdoutSentinel)});`,
    `process.stderr.write(${JSON.stringify(stderrSentinel)});`
  ].join("");
  const result = runHarness([
    "--warmup",
    "0",
    "--runs",
    "1",
    "--",
    process.execPath,
    "-e",
    childSource,
    ...literalArguments
  ]);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.includes(stdoutSentinel), false);
  assert.equal(result.stdout.includes(stderrSentinel), false);
  assert.equal(result.stdout.includes(literalArguments[0]), false);
  assert.equal(result.stdout.includes(literalArguments[1]), false);

  const output = JSON.parse(result.stdout);
  assert.equal(output.warmupRuns, 0);
  assert.equal(output.measuredRuns, 1);
  assert.equal(output.stderrBytes, Buffer.byteLength(stderrSentinel));
  assert.deepEqual(Object.keys(output.durationMs).sort(), ["max", "mean", "median", "min"]);
});

test("reports non-zero exits without exposing child stderr or arguments", () => {
  const stderrSentinel = "synthetic-private-stderr";
  const argumentSentinel = "synthetic-private-argument";
  const result = runHarness([
    "--warmup",
    "0",
    "--runs",
    "1",
    "--",
    process.execPath,
    "-e",
    `process.stderr.write(${JSON.stringify(stderrSentinel)}); process.exit(7);`,
    argumentSentinel
  ]);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /measured run 1/u);
  assert.match(result.stderr, /exit code 7/u);
  assert.match(result.stderr, new RegExp(`stderr bytes ${Buffer.byteLength(stderrSentinel)}`, "u"));
  assert.match(result.stderr, /\[BENCHMARK_COMMAND_FAILED\]/u);
  assert.equal(result.stderr.includes(stderrSentinel), false);
  assert.equal(result.stderr.includes(argumentSentinel), false);
});

test("reports spawn failures without exposing the command", () => {
  const commandSentinel = "synthetic-command-that-does-not-exist-34";
  const result = runHarness([
    "--warmup",
    "0",
    "--runs",
    "1",
    "--",
    commandSentinel
  ]);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /spawn error/u);
  assert.match(result.stderr, /\[BENCHMARK_COMMAND_FAILED\]/u);
  assert.equal(result.stderr.includes(commandSentinel), false);
});

test(
  "reports signal termination without exposing command details",
  { skip: process.platform === "win32" },
  () => {
    const result = runHarness([
      "--warmup",
      "0",
      "--runs",
      "1",
      "--",
      process.execPath,
      "-e",
      'process.kill(process.pid, "SIGTERM")'
    ]);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /signal SIGTERM/u);
    assert.match(result.stderr, /\[BENCHMARK_COMMAND_FAILED\]/u);
  }
);

test("prints a stable usage error without echoing invalid arguments", () => {
  const argumentSentinel = "synthetic-invalid-private-argument";
  const result = runHarness([argumentSentinel]);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /\[BENCHMARK_USAGE_ERROR\]/u);
  assert.equal(result.stderr.includes(argumentSentinel), false);
});

function runHarness(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: "utf8"
  });
}
