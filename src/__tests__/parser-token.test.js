import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { aggregateTokenUsageFromCodexHome } from "../parser/token-aggregate.js";

const parserFixtureCodexHome = fileURLToPath(new URL("./fixtures/parser", import.meta.url));

test("aggregates token and daily usage from session JSONL fixtures", async () => {
  const result = await aggregateTokenUsageFromCodexHome({
    codexHome: parserFixtureCodexHome
  });

  assert.equal(result.diagnostics.status, "ok");
  assert.equal(result.diagnostics.reason, null);
  assert.equal(result.diagnostics.source, "option");
  assert.equal(result.diagnostics.filesScanned, 3);
  assert.equal(result.diagnostics.entriesScanned, 8);
  assert.equal(result.diagnostics.tokenEvents, 5);
  assert.equal(result.diagnostics.tokenEventsWithUsage, 5);
  assert.equal(result.diagnostics.malformedLines, 1);
  assert.equal(result.diagnostics.ignoredEvents, 2);
  assert.equal(JSON.stringify(result.diagnostics).includes(parserFixtureCodexHome), false);
  assert.equal(JSON.stringify(result.diagnostics).includes("lineNumber"), false);
  assert.deepEqual(result.usage, {
    totalTokens: 6780,
    peakDailyTokens: 3680,
    tokenBreakdown: {
      inputTokens: 3400,
      outputTokens: 700,
      cacheReadTokens: 450,
      cacheWriteTokens: null,
      reasoningTokens: 150
    },
    daily: [
      {
        date: "2026-06-10",
        totalTokens: 2200,
        inputTokens: 1500,
        outputTokens: 300,
        cacheReadTokens: 350,
        cacheWriteTokens: null,
        reasoningTokens: 50
      },
      {
        date: "2026-06-11",
        totalTokens: 3680,
        inputTokens: 1200,
        outputTokens: 300,
        cacheReadTokens: 100,
        cacheWriteTokens: null,
        reasoningTokens: 80
      },
      {
        date: "2026-06-12",
        totalTokens: 900,
        inputTokens: 700,
        outputTokens: 100,
        cacheReadTokens: 0,
        cacheWriteTokens: null,
        reasoningTokens: 20
      }
    ]
  });
});

test("returns unavailable usage when session JSONL source is missing", async () => {
  const result = await aggregateTokenUsageFromCodexHome({
    codexHome: fileURLToPath(new URL("./fixtures/parser-missing", import.meta.url))
  });

  assert.equal(result.diagnostics.status, "unavailable");
  assert.equal(result.diagnostics.reason, "session_jsonl_not_found");
  assert.deepEqual(result.usage, {
    totalTokens: 0,
    peakDailyTokens: null,
    tokenBreakdown: {
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheWriteTokens: null,
      reasoningTokens: null
    },
    daily: []
  });
});
