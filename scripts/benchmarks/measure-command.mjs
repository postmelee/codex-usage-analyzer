#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_WARMUP_RUNS = 1;
const DEFAULT_MEASURED_RUNS = 5;
const USAGE =
  "node scripts/benchmarks/measure-command.mjs --warmup N --runs N -- command [args...]";

class BenchmarkUsageError extends Error {}

class BenchmarkCommandError extends Error {
  constructor({ phase, runIndex, kind, exitCode, signal, stderrBytes }) {
    super("benchmark child failed");
    this.phase = phase;
    this.runIndex = runIndex;
    this.kind = kind;
    this.exitCode = exitCode;
    this.signal = signal;
    this.stderrBytes = stderrBytes;
  }
}

export function parseArgs(argv) {
  const separatorIndex = argv.indexOf("--");

  if (separatorIndex === -1 || separatorIndex === argv.length - 1) {
    throw new BenchmarkUsageError();
  }

  const optionArgs = argv.slice(0, separatorIndex);
  const commandArgs = argv.slice(separatorIndex + 1);
  const parsed = {
    warmupRuns: DEFAULT_WARMUP_RUNS,
    measuredRuns: DEFAULT_MEASURED_RUNS,
    command: commandArgs[0],
    commandArgs: commandArgs.slice(1)
  };
  const seen = new Set();

  for (let index = 0; index < optionArgs.length; index += 1) {
    const option = optionArgs[index];

    if (option !== "--warmup" && option !== "--runs") {
      throw new BenchmarkUsageError();
    }

    if (seen.has(option) || index + 1 >= optionArgs.length) {
      throw new BenchmarkUsageError();
    }

    seen.add(option);
    const value = optionArgs[index + 1];
    index += 1;

    if (option === "--warmup") {
      parsed.warmupRuns = parseRunCount(value, true);
    } else {
      parsed.measuredRuns = parseRunCount(value, false);
    }
  }

  if (typeof parsed.command !== "string" || parsed.command.length === 0) {
    throw new BenchmarkUsageError();
  }

  return parsed;
}

export function summarizeDurations(durationsMs) {
  if (
    !Array.isArray(durationsMs) ||
    durationsMs.length === 0 ||
    durationsMs.some(
      (duration) => typeof duration !== "number" || !Number.isFinite(duration) || duration < 0
    )
  ) {
    throw new TypeError("durations must contain finite non-negative numbers");
  }

  const sorted = [...durationsMs].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  const mean = sorted.reduce((total, duration) => total + duration, 0) / sorted.length;

  return {
    median: roundMilliseconds(median),
    mean: roundMilliseconds(mean),
    min: roundMilliseconds(sorted[0]),
    max: roundMilliseconds(sorted.at(-1))
  };
}

export async function runBenchmark({
  command,
  commandArgs = [],
  warmupRuns = DEFAULT_WARMUP_RUNS,
  measuredRuns = DEFAULT_MEASURED_RUNS,
  executeCommand = measureCommand
}) {
  for (let runIndex = 1; runIndex <= warmupRuns; runIndex += 1) {
    await executeCommand({ command, commandArgs, phase: "warmup", runIndex });
  }

  const durationsMs = [];
  let stderrBytes = 0;

  for (let runIndex = 1; runIndex <= measuredRuns; runIndex += 1) {
    const result = await executeCommand({
      command,
      commandArgs,
      phase: "measured",
      runIndex
    });
    durationsMs.push(result.durationMs);
    stderrBytes += result.stderrBytes;
  }

  return {
    warmupRuns,
    measuredRuns,
    durationMs: summarizeDurations(durationsMs),
    stderrBytes
  };
}

export async function main(argv = process.argv.slice(2), io = process) {
  try {
    const options = parseArgs(argv);
    const result = await runBenchmark(options);
    io.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof BenchmarkUsageError) {
      io.stderr.write(`measure-command: invalid arguments. Usage: ${USAGE} [BENCHMARK_USAGE_ERROR]\n`);
      return 1;
    }

    if (error instanceof BenchmarkCommandError) {
      io.stderr.write(`${formatCommandError(error)}\n`);
      return 1;
    }

    io.stderr.write("measure-command: unexpected failure. [BENCHMARK_UNEXPECTED_ERROR]\n");
    return 1;
  }
}

function parseRunCount(value, allowZero) {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/u.test(value)) {
    throw new BenchmarkUsageError();
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || (!allowZero && parsed === 0)) {
    throw new BenchmarkUsageError();
  }

  return parsed;
}

function roundMilliseconds(value) {
  return Math.round((value + Number.EPSILON) * 1_000) / 1_000;
}

function measureCommand({ command, commandArgs, phase, runIndex }) {
  const startedAt = process.hrtime.bigint();

  return new Promise((resolveRun, rejectRun) => {
    let child;
    let settled = false;
    let stderrBytes = 0;

    const rejectSafely = (details) => {
      if (settled) {
        return;
      }

      settled = true;
      rejectRun(
        new BenchmarkCommandError({
          phase,
          runIndex,
          stderrBytes,
          ...details
        })
      );
    };

    try {
      child = spawn(command, commandArgs, {
        shell: false,
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true
      });
    } catch {
      rejectSafely({ kind: "spawn" });
      return;
    }

    child.stderr.on("data", (chunk) => {
      stderrBytes += Buffer.byteLength(chunk);
    });

    child.once("error", () => {
      rejectSafely({ kind: "spawn" });
    });

    child.once("close", (exitCode, signal) => {
      if (settled) {
        return;
      }

      if (exitCode !== 0 || signal !== null) {
        rejectSafely({ kind: "exit", exitCode, signal });
        return;
      }

      settled = true;
      const finishedAt = process.hrtime.bigint();
      resolveRun({
        durationMs: Number(finishedAt - startedAt) / 1_000_000,
        stderrBytes
      });
    });
  });
}

function formatCommandError(error) {
  const prefix = `measure-command: child failed during ${error.phase} run ${error.runIndex}`;

  if (error.kind === "spawn") {
    return `${prefix} (spawn error, stderr bytes ${error.stderrBytes}). [BENCHMARK_COMMAND_FAILED]`;
  }

  const outcome =
    error.signal === null ? `exit code ${error.exitCode}` : `signal ${error.signal}`;
  return `${prefix} (${outcome}, stderr bytes ${error.stderrBytes}). [BENCHMARK_COMMAND_FAILED]`;
}

const directPath = process.argv[1] ? resolve(process.argv[1]) : null;

if (directPath === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
