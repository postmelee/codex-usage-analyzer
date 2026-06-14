import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ANALYZER_NAME,
  ANALYZER_VERSION,
  analyzeUsage,
  createSampleUsageSnapshotV2,
  sampleUsageSnapshotV2,
  validateUsageSnapshotV2
} from "../index.js";

const parserFixtureDir = fileURLToPath(new URL("./fixtures/parser", import.meta.url));
const missingParserFixtureDir = fileURLToPath(new URL("./fixtures/parser-missing", import.meta.url));
const forbiddenParserFixturePattern = /\/Users\/|\/home\/|\/private\/var\/|access_token|refresh_token|Bearer |sk-|github_pat_/;

test("analyzes usage into a production unavailable UsageSnapshot v2", async () => {
  const before = Date.now();
  const snapshot = await analyzeUsage({
    codexHome: missingParserFixtureDir
  });
  const after = Date.now();
  const result = validateUsageSnapshotV2(snapshot);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(snapshot.producer.name, ANALYZER_NAME);
  assert.equal(snapshot.producer.version, ANALYZER_VERSION);
  assert.ok(Date.parse(snapshot.capturedAt) >= before);
  assert.ok(Date.parse(snapshot.capturedAt) <= after);
  assert.equal(snapshot.usage.totalTokens, 0);
  assert.notEqual(snapshot.usage.totalTokens, sampleUsageSnapshotV2.usage.totalTokens);
  assert.deepEqual(snapshot.usage.tokenBreakdown, {
    inputTokens: null,
    outputTokens: null,
    cacheReadTokens: null,
    cacheWriteTokens: null,
    reasoningTokens: null
  });
  assert.deepEqual(snapshot.usage.daily, []);
  assert.equal(snapshot.models.favoriteModel, null);
  assert.deepEqual(snapshot.models.items, []);
  assert.deepEqual(snapshot.activity, {
    longestTaskDurationMs: null,
    currentStreakDays: null,
    longestStreakDays: null,
    fastModePercent: null,
    reasoningEffort: null,
    reasoningEffortPercent: null,
    totalThreads: null
  });
  assert.deepEqual(snapshot.skills, {
    exploredCount: null,
    totalUsed: null,
    topSkills: []
  });
  assert.deepEqual(snapshot.plugins, {
    topPlugins: []
  });
  assert.equal(snapshot.codexProfile, undefined);
  assert.equal(snapshot.codexAssets, undefined);
  assert.equal(snapshot.extensions["codexUsageAnalyzer.fixture"], undefined);
  assert.equal(snapshot.extensions["codexUsageAnalyzer.diagnostics"].status, "unavailable");
  assert.equal(
    snapshot.extensions["codexUsageAnalyzer.diagnostics"].reason,
    "session_jsonl_not_found"
  );
  assert.deepEqual(
    snapshot.extensions["codexUsageAnalyzer.diagnostics"].profileComparison,
    {
      status: "not_performed",
      reason: "remote_profile_api_not_used",
      localStreakBasis: "session_jsonl_utc_dates",
      remoteProfileBasis: "codex_desktop_remote_profile_api",
      parity: "not_guaranteed"
    }
  );
  assert.deepEqual(
    snapshot.extensions["codexUsageAnalyzer.diagnostics"].unavailableFields,
    ["skills", "plugins", "usage", "models", "activity"]
  );
});

test("normalizes capturedAt for the production unavailable snapshot", async () => {
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-13T00:00:00.000Z",
    codexHome: missingParserFixtureDir
  });

  assert.equal(snapshot.capturedAt, "2026-06-13T00:00:00.000Z");
});

test("analyzes parser fixture into a production UsageSnapshot v2", async () => {
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-13T00:00:00.000Z",
    codexHome: parserFixtureDir,
    now: "2026-06-12T23:59:59.000Z"
  });
  const result = validateUsageSnapshotV2(snapshot);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(snapshot.extensions["codexUsageAnalyzer.fixture"], undefined);
  assert.equal(snapshot.usage.totalTokens, 6780);
  assert.equal(snapshot.usage.peakDailyTokens, 3680);
  assert.equal(snapshot.usage.daily.length, 3);
  assert.equal(snapshot.models.favoriteModel.model, "gpt-5-codex");
  assert.equal(snapshot.models.favoriteModel.totalTokens, 5230);
  assert.equal(snapshot.models.items.length, 2);
  assert.deepEqual(snapshot.activity, {
    longestTaskDurationMs: 240000,
    currentStreakDays: 3,
    longestStreakDays: 3,
    fastModePercent: null,
    reasoningEffort: "high",
    reasoningEffortPercent: 40,
    totalThreads: 3
  });
  assert.deepEqual(snapshot.skills, {
    exploredCount: null,
    totalUsed: null,
    topSkills: []
  });
  assert.deepEqual(snapshot.plugins, {
    topPlugins: []
  });
  assert.equal(snapshot.extensions["codexUsageAnalyzer.diagnostics"].status, "partial");
  assert.equal(
    snapshot.extensions["codexUsageAnalyzer.diagnostics"].reason,
    "local_sources_partially_available"
  );
  assert.deepEqual(
    snapshot.extensions["codexUsageAnalyzer.diagnostics"].parsedFields,
    ["usage", "models", "activity"]
  );
  assert.deepEqual(
    snapshot.extensions["codexUsageAnalyzer.diagnostics"].unavailableFields,
    ["skills", "plugins", "activity.fastModePercent"]
  );
  assert.deepEqual(
    snapshot.extensions["codexUsageAnalyzer.diagnostics"].profileComparison,
    {
      status: "not_performed",
      reason: "remote_profile_api_not_used",
      localStreakBasis: "session_jsonl_utc_dates",
      remoteProfileBasis: "codex_desktop_remote_profile_api",
      parity: "not_guaranteed"
    }
  );
  assert.equal(
    snapshot.extensions["codexUsageAnalyzer.diagnostics"].activity.streakDateBasis,
    "utc_date_from_session_token_usage"
  );
  assert.equal(
    snapshot.extensions["codexUsageAnalyzer.diagnostics"].activity.profileParity,
    "not_guaranteed"
  );
  assert.equal(JSON.stringify(snapshot).includes(parserFixtureDir), false);
  assert.equal(JSON.stringify(snapshot).includes("lineNumber"), false);
});

test("creates a sample UsageSnapshot v2 with safe overrides", () => {
  const snapshot = createSampleUsageSnapshotV2({
    capturedAt: "2026-06-13T00:00:00.000Z",
    usage: {
      totalTokens: 42
    }
  });
  const result = validateUsageSnapshotV2(snapshot);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(snapshot.capturedAt, "2026-06-13T00:00:00.000Z");
  assert.equal(snapshot.usage.totalTokens, 42);
  assert.equal(snapshot.usage.tokenBreakdown.inputTokens, 646900000);
  assert.deepEqual(
    snapshot.extensions["codexUsageAnalyzer.fixture"],
    sampleUsageSnapshotV2.extensions["codexUsageAnalyzer.fixture"]
  );
});

test("keeps parser source fixtures synthetic and private-safe", () => {
  const matches = [];

  for (const fixturePath of listFixtureFiles(parserFixtureDir)) {
    const content = readFileSync(fixturePath, "utf8");

    if (forbiddenParserFixturePattern.test(content)) {
      matches.push(fixturePath);
    }
  }

  assert.deepEqual(matches, []);
});

function listFixtureFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    const entryPath = join(directory, entry);

    if (statSync(entryPath).isDirectory()) {
      files.push(...listFixtureFiles(entryPath));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}
