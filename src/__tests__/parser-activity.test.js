import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { aggregateActivityFromCodexHome } from "../parser/activity-aggregate.js";
import { aggregateModelUsageFromCodexHome } from "../parser/model-aggregate.js";

const parserFixtureCodexHome = fileURLToPath(new URL("./fixtures/parser", import.meta.url));
const missingParserFixtureCodexHome = fileURLToPath(new URL("./fixtures/parser-missing", import.meta.url));

test("aggregates model usage from session JSONL fixtures", async () => {
  const result = await aggregateModelUsageFromCodexHome({
    codexHome: parserFixtureCodexHome
  });

  assert.equal(result.diagnostics.status, "ok");
  assert.equal(result.diagnostics.reason, null);
  assert.equal(result.diagnostics.source, "option");
  assert.equal(result.diagnostics.filesScanned, 3);
  assert.equal(result.diagnostics.entriesScanned, 7);
  assert.equal(result.diagnostics.tokenEvents, 5);
  assert.equal(result.diagnostics.tokenEventsWithModel, 5);
  assert.equal(result.diagnostics.tokenEventsWithUsage, 5);
  assert.equal(result.diagnostics.malformedLines, 1);
  assert.equal(result.diagnostics.ignoredEvents, 1);
  assert.equal(JSON.stringify(result.diagnostics).includes(parserFixtureCodexHome), false);
  assert.equal(JSON.stringify(result.diagnostics).includes("lineNumber"), false);
  assert.deepEqual(result.models, {
    favoriteModel: {
      model: "gpt-5-codex",
      displayName: null,
      totalTokens: 5230,
      usageCount: 3,
      basis: "tokens",
      inputTokens: 2200,
      outputTokens: 500,
      cacheReadTokens: 400,
      cacheWriteTokens: null,
      reasoningTokens: 130
    },
    items: [
      {
        model: "gpt-5-codex",
        displayName: null,
        totalTokens: 5230,
        usageCount: 3,
        basis: "tokens",
        inputTokens: 2200,
        outputTokens: 500,
        cacheReadTokens: 400,
        cacheWriteTokens: null,
        reasoningTokens: 130
      },
      {
        model: "gpt-5-mini",
        displayName: null,
        totalTokens: 1550,
        usageCount: 2,
        basis: "tokens",
        inputTokens: 1200,
        outputTokens: 200,
        cacheReadTokens: 50,
        cacheWriteTokens: null,
        reasoningTokens: 20
      }
    ]
  });
});

test("aggregates activity signals from session JSONL fixtures", async () => {
  const result = await aggregateActivityFromCodexHome({
    codexHome: parserFixtureCodexHome,
    now: "2026-06-12T23:59:59.000Z"
  });

  assert.equal(result.diagnostics.status, "ok");
  assert.equal(result.diagnostics.reason, null);
  assert.equal(result.diagnostics.source, "option");
  assert.equal(result.diagnostics.filesScanned, 3);
  assert.equal(result.diagnostics.entriesScanned, 7);
  assert.equal(result.diagnostics.tokenEvents, 5);
  assert.equal(result.diagnostics.tokenEventsWithDateUsage, 5);
  assert.equal(result.diagnostics.tokenEventsWithDuration, 5);
  assert.equal(result.diagnostics.tokenEventsWithEffort, 5);
  assert.equal(result.diagnostics.tokenEventsWithMode, 4);
  assert.equal(result.diagnostics.malformedLines, 1);
  assert.equal(result.diagnostics.ignoredEvents, 1);
  assert.deepEqual(result.diagnostics.unavailableFields, ["fastModePercent"]);
  assert.equal(result.diagnostics.fastModeReason, "source_unconfirmed");
  assert.equal(JSON.stringify(result.diagnostics).includes(parserFixtureCodexHome), false);
  assert.equal(JSON.stringify(result.diagnostics).includes("lineNumber"), false);
  assert.deepEqual(result.activity, {
    longestTaskDurationMs: 240000,
    currentStreakDays: 3,
    longestStreakDays: 3,
    fastModePercent: null,
    reasoningEffort: "high",
    reasoningEffortPercent: 40,
    totalThreads: 3
  });
});

test("returns unavailable model and activity aggregates when session source is missing", async () => {
  const modelResult = await aggregateModelUsageFromCodexHome({
    codexHome: missingParserFixtureCodexHome
  });
  const activityResult = await aggregateActivityFromCodexHome({
    codexHome: missingParserFixtureCodexHome,
    now: "2026-06-12T23:59:59.000Z"
  });

  assert.equal(modelResult.diagnostics.status, "unavailable");
  assert.equal(modelResult.diagnostics.reason, "session_jsonl_not_found");
  assert.deepEqual(modelResult.models, {
    favoriteModel: null,
    items: []
  });

  assert.equal(activityResult.diagnostics.status, "unavailable");
  assert.equal(activityResult.diagnostics.reason, "session_jsonl_not_found");
  assert.deepEqual(activityResult.activity, {
    longestTaskDurationMs: null,
    currentStreakDays: null,
    longestStreakDays: null,
    fastModePercent: null,
    reasoningEffort: null,
    reasoningEffortPercent: null,
    totalThreads: null
  });
});
