import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYZER_NAME,
  ANALYZER_VERSION,
  analyzeUsage,
  createSampleUsageSnapshotV2,
  sampleUsageSnapshotV2,
  validateUsageSnapshotV2
} from "../index.js";

test("analyzes usage into a production unavailable UsageSnapshot v2", async () => {
  const before = Date.now();
  const snapshot = await analyzeUsage();
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
  assert.deepEqual(snapshot.extensions["codexUsageAnalyzer.diagnostics"], {
    status: "unavailable",
    reason: "local_parser_not_implemented",
    unavailableFields: ["usage", "models", "activity", "skills", "plugins"]
  });
});

test("normalizes capturedAt for the production unavailable snapshot", async () => {
  const snapshot = await analyzeUsage({
    capturedAt: "2026-06-13T00:00:00.000Z"
  });

  assert.equal(snapshot.capturedAt, "2026-06-13T00:00:00.000Z");
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
