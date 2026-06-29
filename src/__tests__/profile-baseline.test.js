import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { analyzeUsage, createSampleUsageSnapshotV2 } from "../index.js";
import {
  compareProfileBaseline,
  loadProfileBaseline,
  validateProfileBaseline
} from "../profile-baseline.js";

const baselineFixturePath = fileURLToPath(
  new URL("./fixtures/profile-baseline/redacted-baseline.json", import.meta.url)
);
const sourceMismatchBaselineFixturePath = fileURLToPath(
  new URL("./fixtures/profile-baseline/source-mismatch-baseline.json", import.meta.url)
);
const parserFixtureCodexHome = fileURLToPath(new URL("./fixtures/parser", import.meta.url));
const profileSmokeScriptPath = fileURLToPath(
  new URL("../../scripts/profile-smoke.js", import.meta.url)
);

test("compares parser fixture snapshot with redacted baseline", async () => {
  const baseline = loadProfileBaseline(baselineFixturePath);
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-16T00:00:00.000Z",
    codexHome: parserFixtureCodexHome
  });

  const result = compareProfileBaseline(snapshot, baseline);

  assert.equal(result.status, "ok");
  assert.equal(result.summary.mismatched, 0);
  assert.equal(result.summary.notComparable, 2);
  assert.ok(result.summary.matched > 0);
  assert.equal(JSON.stringify(result).includes(parserFixtureCodexHome), false);
});

test("marks numeric values within tolerance", async () => {
  const baseline = loadProfileBaseline(baselineFixturePath);
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-16T00:00:00.000Z",
    codexHome: parserFixtureCodexHome
  });
  const adjustedBaseline = structuredClone(baseline);
  adjustedBaseline.expected.usage.totalTokens = snapshot.usage.totalTokens + 5;

  const result = compareProfileBaseline(snapshot, adjustedBaseline);
  const totalTokenResult = result.results.find((entry) => entry.field === "usage.totalTokens");

  assert.equal(result.status, "ok");
  assert.equal(totalTokenResult.status, "within_tolerance");
});

test("reports mismatches with field-level safe values", async () => {
  const baseline = loadProfileBaseline(baselineFixturePath);
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-16T00:00:00.000Z",
    codexHome: parserFixtureCodexHome
  });
  const adjustedBaseline = structuredClone(baseline);
  adjustedBaseline.expected.usage.totalTokens = 1;

  const result = compareProfileBaseline(snapshot, adjustedBaseline);
  const totalTokenResult = result.results.find((entry) => entry.field === "usage.totalTokens");

  assert.equal(result.status, "failed");
  assert.equal(result.summary.mismatched, 1);
  assert.equal(totalTokenResult.status, "mismatch");
  assert.equal(totalTokenResult.reason, "numeric_mismatch");
  assert.equal(JSON.stringify(result).includes(parserFixtureCodexHome), false);
});

test("reports source-policy numeric mismatches with source-aware reason", async () => {
  const baseline = loadProfileBaseline(baselineFixturePath);
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-16T00:00:00.000Z",
    codexHome: parserFixtureCodexHome
  });
  const adjustedBaseline = structuredClone(baseline);
  adjustedBaseline.expected.usage.totalTokens = snapshot.usage.totalTokens + 1000;
  adjustedBaseline.sourcePolicy = {
    "usage.totalTokens": "source_mismatch"
  };

  const result = compareProfileBaseline(snapshot, adjustedBaseline);
  const totalTokenResult = result.results.find((entry) => entry.field === "usage.totalTokens");

  assert.equal(result.status, "failed");
  assert.equal(totalTokenResult.status, "mismatch");
  assert.equal(totalTokenResult.reason, "source_mismatch");
});

test("keeps numeric mismatch reason for comparable fields without source policy", async () => {
  const baseline = loadProfileBaseline(baselineFixturePath);
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-16T00:00:00.000Z",
    codexHome: parserFixtureCodexHome
  });
  const adjustedBaseline = structuredClone(baseline);
  adjustedBaseline.expected.usage.totalTokens = snapshot.usage.totalTokens + 1000;

  const result = compareProfileBaseline(snapshot, adjustedBaseline);
  const totalTokenResult = result.results.find((entry) => entry.field === "usage.totalTokens");

  assert.equal(result.status, "failed");
  assert.equal(totalTokenResult.status, "mismatch");
  assert.equal(totalTokenResult.reason, "numeric_mismatch");
});

test("uses profile parity reason for source-sensitive mismatches without source policy", async () => {
  const baseline = loadProfileBaseline(baselineFixturePath);
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-16T00:00:00.000Z",
    codexHome: parserFixtureCodexHome
  });
  const adjustedBaseline = structuredClone(baseline);
  adjustedBaseline.expected.activity.totalThreads = snapshot.activity.totalThreads + 10;

  const result = compareProfileBaseline(snapshot, adjustedBaseline);
  const totalThreadsResult = result.results.find((entry) => entry.field === "activity.totalThreads");

  assert.equal(result.status, "failed");
  assert.equal(totalThreadsResult.status, "mismatch");
  assert.equal(totalThreadsResult.reason, "profile_parity_not_guaranteed");
});

test("compares source mismatch baseline with source-aware reasons", async () => {
  const baseline = loadProfileBaseline(sourceMismatchBaselineFixturePath);
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-16T00:00:00.000Z",
    codexHome: parserFixtureCodexHome
  });

  const result = compareProfileBaseline(snapshot, baseline);
  const sourceMismatchResults = result.results.filter((entry) => entry.reason === "source_mismatch");

  assert.equal(result.status, "failed");
  assert.equal(result.summary.mismatched, 4);
  assert.equal(sourceMismatchResults.length, 4);
  assert.deepEqual(sourceMismatchResults.map((entry) => entry.field), [
    "activity.currentStreakDays",
    "activity.totalThreads",
    "skills.topSkills[0]",
    "plugins.topPlugins[0]"
  ]);
  assert.equal(JSON.stringify(result).includes(parserFixtureCodexHome), false);
});

test("supports not-comparable and skipped expected fields", async () => {
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-16T00:00:00.000Z",
    codexHome: parserFixtureCodexHome
  });
  const baseline = {
    schemaVersion: 1,
    source: "manual-profile-ui",
    capturedProfileAt: "2026-06-16T00:00:00.000Z",
    profileDateBasis: "codex_desktop_remote_profile",
    expected: {
      activity: {
        currentStreakDays: {
          status: "not_comparable",
          reason: "remote_profile_source_differs"
        }
      }
    }
  };

  const result = compareProfileBaseline(snapshot, baseline);

  assert.equal(result.status, "not_comparable");
  assert.equal(result.summary.notComparable, 1);
  assert.ok(result.summary.skipped > 0);
});

test("rejects invalid source policy values and fields", () => {
  const baseline = loadProfileBaseline(baselineFixturePath);
  const adjustedBaseline = structuredClone(baseline);
  adjustedBaseline.sourcePolicy = {
    "usage.totalTokens": "numeric_mismatch",
    "unknown.field": "source_mismatch"
  };

  const validation = validateProfileBaseline(adjustedBaseline);
  const result = compareProfileBaseline(createProductionLikeSnapshot(), adjustedBaseline);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join("\n"), /sourcePolicy\.usage\.totalTokens/);
  assert.match(validation.errors.join("\n"), /sourcePolicy\.unknown\.field/);
  assert.equal(result.status, "invalid_baseline");
});

test("rejects sensitive-looking baseline values", () => {
  const baseline = loadProfileBaseline(baselineFixturePath);
  const adjustedBaseline = structuredClone(baseline);
  adjustedBaseline.source = "/Users/example/private-baseline.json";

  const validation = validateProfileBaseline(adjustedBaseline);
  const result = compareProfileBaseline(createProductionLikeSnapshot(), adjustedBaseline);

  assert.equal(validation.ok, false);
  assert.equal(result.status, "invalid_baseline");
  assert.equal(JSON.stringify(result).includes("/Users/example"), false);
});

test("allows task-style plugin ids while rejecting secret-looking token strings", () => {
  const baseline = loadProfileBaseline(baselineFixturePath);
  const adjustedBaseline = structuredClone(baseline);
  adjustedBaseline.expected.plugins.topPlugins = [
    {
      id: "task-start",
      usageCount: 10
    },
    {
      id: "task-register",
      usageCount: 5
    },
    {
      id: "pr-merge-cleanup",
      usageCount: 3
    }
  ];

  assert.equal(validateProfileBaseline(adjustedBaseline).ok, true);

  adjustedBaseline.expected.plugins.topPlugins[0].id = "sk-1234567890abcdef";

  const validation = validateProfileBaseline(adjustedBaseline);
  const result = compareProfileBaseline(createProductionLikeSnapshot(), adjustedBaseline);

  assert.equal(validation.ok, false);
  assert.equal(result.status, "invalid_baseline");
  assert.equal(JSON.stringify(result).includes("sk-1234567890abcdef"), false);
});

test("rejects sample fixture snapshots for profile smoke", () => {
  const baseline = loadProfileBaseline(baselineFixturePath);
  const sampleSnapshot = createSampleUsageSnapshotV2();

  const result = compareProfileBaseline(sampleSnapshot, baseline);

  assert.equal(result.status, "invalid_snapshot");
  assert.equal(result.reason, "sample_fixture_not_allowed");
});

test("profile smoke script outputs safe summary without input paths", async () => {
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-16T00:00:00.000Z",
    codexHome: parserFixtureCodexHome
  });
  const tempDir = mkdtempSync(join(tmpdir(), "codex-usage-profile-smoke-"));
  const snapshotPath = join(tempDir, "snapshot.json");
  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);

  const result = spawnSync(process.execPath, [
    profileSmokeScriptPath,
    "--baseline",
    baselineFixturePath,
    "--snapshot",
    snapshotPath
  ], {
    encoding: "utf8"
  });
  const summary = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.equal(summary.status, "ok");
  assert.equal(result.stdout.includes(baselineFixturePath), false);
  assert.equal(result.stdout.includes(snapshotPath), false);
  assert.equal(result.stdout.includes(parserFixtureCodexHome), false);
});

test("profile smoke script rejects fixture sample snapshots", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "codex-usage-profile-smoke-"));
  const snapshotPath = join(tempDir, "sample-snapshot.json");
  writeFileSync(snapshotPath, `${JSON.stringify(createSampleUsageSnapshotV2(), null, 2)}\n`);

  const result = spawnSync(process.execPath, [
    profileSmokeScriptPath,
    "--baseline",
    baselineFixturePath,
    "--snapshot",
    snapshotPath
  ], {
    encoding: "utf8"
  });
  const summary = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.equal(summary.status, "invalid_snapshot");
  assert.equal(summary.reason, "sample_fixture_not_allowed");
  assert.equal(result.stdout.includes(snapshotPath), false);
});

test("profile smoke script reports source-aware mismatch summary safely", async () => {
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-16T00:00:00.000Z",
    codexHome: parserFixtureCodexHome
  });
  const tempDir = mkdtempSync(join(tmpdir(), "codex-usage-profile-smoke-"));
  const snapshotPath = join(tempDir, "snapshot.json");
  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);

  const result = spawnSync(process.execPath, [
    profileSmokeScriptPath,
    "--baseline",
    sourceMismatchBaselineFixturePath,
    "--snapshot",
    snapshotPath
  ], {
    encoding: "utf8"
  });
  const summary = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.equal(summary.status, "failed");
  assert.equal(summary.summary.mismatched, 4);
  assert.equal(summary.results.filter((entry) => entry.reason === "source_mismatch").length, 4);
  assert.equal(result.stdout.includes(sourceMismatchBaselineFixturePath), false);
  assert.equal(result.stdout.includes(snapshotPath), false);
  assert.equal(result.stdout.includes(parserFixtureCodexHome), false);
});

test("profile smoke script reads help without touching files", () => {
  const result = spawnSync(process.execPath, [profileSmokeScriptPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /node scripts\/profile-smoke\.js --baseline/);
  assert.equal(result.stderr, "");
});

test("profile baseline fixture remains valid JSON", () => {
  const baseline = JSON.parse(readFileSync(baselineFixturePath, "utf8"));
  const validation = validateProfileBaseline(baseline);

  assert.equal(validation.ok, true, validation.errors.join("\n"));
});

test("source mismatch baseline fixture remains valid JSON", () => {
  const baseline = JSON.parse(readFileSync(sourceMismatchBaselineFixturePath, "utf8"));
  const validation = validateProfileBaseline(baseline);

  assert.equal(validation.ok, true, validation.errors.join("\n"));
});

function createProductionLikeSnapshot() {
  return {
    schemaVersion: 2,
    capturedAt: "2026-06-16T00:00:00.000Z",
    usage: {
      totalTokens: 1,
      peakDailyTokens: 1,
      tokenBreakdown: {
        inputTokens: null,
        outputTokens: null,
        cacheReadTokens: null,
        cacheWriteTokens: null,
        reasoningTokens: null
      },
      daily: []
    },
    models: {
      favoriteModel: null,
      items: []
    },
    activity: {
      longestTaskDurationMs: null,
      currentStreakDays: null,
      longestStreakDays: null,
      fastModePercent: null,
      reasoningEffort: null,
      reasoningEffortPercent: null,
      totalThreads: null
    },
    skills: {
      exploredCount: null,
      totalUsed: null,
      topSkills: []
    },
    plugins: {
      topPlugins: []
    },
    extensions: {
      "codexUsageAnalyzer.diagnostics": {
        profileComparison: {
          parity: "not_guaranteed"
        }
      }
    }
  };
}
