import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXPERIMENTAL_PROFILE_WARNING,
  runCli
} from "../cli.js";
import { CODEX_USAGE_ERROR_CODES, CodexUsageError } from "../errors.js";

const binPath = fileURLToPath(new URL("../../bin/codex-usage-analyzer.js", import.meta.url));
const usage = {
  contractVersion: 1,
  capturedAt: "2026-07-11T00:00:00.000Z",
  summary: {
    lifetimeTokens: 1_234_567,
    peakDailyTokens: 45_678,
    longestRunningTurnSec: 540,
    currentStreakDays: 8,
    longestStreakDays: 14
  },
  dailyUsageBuckets: [
    { startDate: "2026-07-10", tokens: 12_345 }
  ]
};
const fullProfile = {
  fullProfileContractVersion: 1,
  kind: "codex-usage-analyzer.fullProfile",
  stability: "experimental",
  status: "ok",
  usage,
  profile: {
    displayName: "Synthetic Name",
    username: "synthetic-user",
    avatarUrl: "https://example.invalid/avatar.png",
    planType: "synthetic-plan"
  },
  activityInsights: {
    fastModePercent: 25,
    reasoningEffort: "synthetic-effort",
    reasoningEffortPercent: 50,
    skillsExplored: 6,
    totalSkillsUsed: 7,
    totalThreads: 8,
    topInvocations: []
  }
};

test("prints a human-readable account usage summary with no arguments", async () => {
  const io = captureIo();
  const exitCode = await runCli([], io, {
    readAccountUsage: async () => usage
  });

  assert.equal(exitCode, 0);
  assert.equal(io.stderr.value, "");
  assert.match(io.stdout.value, /^Codex account usage\n/u);
  assert.match(io.stdout.value, /Lifetime tokens\s+1\.23M/u);
  assert.match(io.stdout.value, /Current streak\s+8 days/u);
  assert.match(io.stdout.value, /Captured at 2026-07-11T00:00:00\.000Z/u);
});

test("supports the explicit usage alias", async () => {
  const io = captureIo();
  const exitCode = await runCli(["usage"], io, {
    readAccountUsage: async () => usage
  });

  assert.equal(exitCode, 0);
  assert.match(io.stdout.value, /^Codex account usage\n/u);
});

test("prints the exact account usage contract as JSON", async () => {
  const io = captureIo();
  const exitCode = await runCli(["usage", "--json"], io, {
    readAccountUsage: async () => usage
  });

  assert.equal(exitCode, 0);
  assert.equal(io.stderr.value, "");
  assert.deepEqual(JSON.parse(io.stdout.value), usage);
});

test("does not invoke experimental dependencies for the default usage action", async () => {
  const io = captureIo();
  let experimentalCalls = 0;
  const exitCode = await runCli([], io, {
    readAccountUsage: async () => usage,
    readExperimentalProfile: async () => {
      experimentalCalls += 1;
      return fullProfile;
    }
  });

  assert.equal(exitCode, 0);
  assert.equal(experimentalCalls, 0);
  assert.equal(io.stderr.value, "");
});

test("prints a human profile with one experimental warning", async () => {
  const io = captureIo();
  let formattedValue;
  const exitCode = await runCli(["profile"], io, {
    readExperimentalProfile: async () => fullProfile,
    formatExperimentalProfile(value) {
      formattedValue = value;
      return "Synthetic formatted profile";
    }
  });

  assert.equal(exitCode, 0);
  assert.equal(formattedValue, fullProfile);
  assert.equal(io.stdout.value, "Synthetic formatted profile\n");
  assert.equal(io.stderr.value, `${EXPERIMENTAL_PROFILE_WARNING}\n`);
});

test("prints pure profile JSON and maps profile status to exit code", async (t) => {
  for (const [status, expectedExitCode] of [
    ["ok", 0],
    ["partial", 0],
    ["unavailable", 1]
  ]) {
    await t.test(status, async () => {
      const io = captureIo();
      const result = {
        ...fullProfile,
        status,
        profile: status === "unavailable" ? null : fullProfile.profile,
        activityInsights: status === "unavailable"
          ? null
          : fullProfile.activityInsights
      };
      const exitCode = await runCli(["profile", "--json"], io, {
        readExperimentalProfile: async () => result
      });

      assert.equal(exitCode, expectedExitCode);
      assert.deepEqual(JSON.parse(io.stdout.value), result);
      assert.equal(io.stdout.value.includes("Warning"), false);
      assert.equal(io.stderr.value, `${EXPERIMENTAL_PROFILE_WARNING}\n`);
    });
  }
});

test("prints help without starting app-server", async () => {
  for (const argv of [
    ["--help"],
    ["usage", "-h"],
    ["profile", "--help"],
    ["profile", "-h"]
  ]) {
    const io = captureIo();
    let usageCalled = false;
    let profileCalled = false;
    const exitCode = await runCli(argv, io, {
      readAccountUsage: async () => {
        usageCalled = true;
      },
      readExperimentalProfile: async () => {
        profileCalled = true;
      }
    });

    assert.equal(exitCode, 0);
    assert.equal(usageCalled, false);
    assert.equal(profileCalled, false);
    assert.match(io.stdout.value, /codex-usage-analyzer \[usage\] \[--json\]/u);
    assert.match(io.stdout.value, /profile \[--json\]  \(experimental\)/u);
    assert.equal(io.stderr.value, "");
  }
});

test("prints version without starting app-server", async () => {
  const io = captureIo();
  let called = false;
  const exitCode = await runCli(["--version"], io, {
    readAccountUsage: async () => {
      called = true;
    }
  });

  assert.equal(exitCode, 0);
  assert.equal(called, false);
  assert.equal(io.stdout.value, "0.3.0\n");
  assert.equal(io.stderr.value, "");
});

test("rejects unknown commands and conflicting flags without app-server", async () => {
  for (const argv of [
    ["analyze"],
    ["--json", "--json"],
    ["usage", "--wat"],
    ["profile", "--json", "--json"],
    ["profile", "--wat"]
  ]) {
    const io = captureIo();
    let usageCalled = false;
    let profileCalled = false;
    const exitCode = await runCli(argv, io, {
      readAccountUsage: async () => {
        usageCalled = true;
      },
      readExperimentalProfile: async () => {
        profileCalled = true;
      }
    });

    assert.equal(exitCode, 1);
    assert.equal(usageCalled, false);
    assert.equal(profileCalled, false);
    assert.equal(io.stdout.value, "");
    assert.match(io.stderr.value, /^codex-usage-analyzer - Read/u);
    assert.equal(io.stderr.value.includes("Warning"), false);
  }
});

test("prints safe known errors without upstream details", async () => {
  const io = captureIo();
  const error = new CodexUsageError(CODEX_USAGE_ERROR_CODES.APP_SERVER_RPC_ERROR);
  error.upstreamDetail = "synthetic-sensitive-detail";
  const exitCode = await runCli(["--json"], io, {
    readAccountUsage: async () => {
      throw error;
    }
  });

  assert.equal(exitCode, 1);
  assert.equal(io.stdout.value, "");
  assert.match(io.stderr.value, /\[APP_SERVER_RPC_ERROR\]/u);
  assert.equal(io.stderr.value.includes("synthetic-sensitive-detail"), false);
});

test("redacts unexpected errors", async () => {
  const io = captureIo();
  const exitCode = await runCli([], io, {
    readAccountUsage: async () => {
      throw new Error("synthetic-sensitive-detail");
    }
  });

  assert.equal(exitCode, 1);
  assert.equal(io.stdout.value, "");
  assert.equal(
    io.stderr.value,
    "codex-usage-analyzer: Unexpected failure. [UNEXPECTED_ERROR]\n"
  );
});

test("prints the profile warning and a safe error without an envelope", async () => {
  const io = captureIo();
  const error = new CodexUsageError(CODEX_USAGE_ERROR_CODES.APP_SERVER_RPC_ERROR);
  error.upstreamDetail = "synthetic-sensitive-detail";
  const exitCode = await runCli(["profile", "--json"], io, {
    readExperimentalProfile: async () => {
      throw error;
    }
  });

  assert.equal(exitCode, 1);
  assert.equal(io.stdout.value, "");
  assert.equal(
    io.stderr.value,
    `${EXPERIMENTAL_PROFILE_WARNING}\n`
      + `codex-usage-analyzer: ${error.message} [${error.code}]\n`
  );
  assert.equal(io.stderr.value.includes("synthetic-sensitive-detail"), false);
});

test("the package bin resolves version without account access", () => {
  const result = spawnSync(process.execPath, [binPath, "--version"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "0.3.0\n");
  assert.equal(result.stderr, "");
});

function captureIo() {
  return {
    stdout: createWriter(),
    stderr: createWriter()
  };
}

function createWriter() {
  return {
    value: "",
    write(chunk) {
      this.value += chunk;
    }
  };
}
