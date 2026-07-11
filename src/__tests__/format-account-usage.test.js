import assert from "node:assert/strict";
import test from "node:test";

import { formatAccountUsage } from "../format-account-usage.js";

test("formats compact values, durations, streaks, and bucket count", () => {
  const output = formatAccountUsage({
    capturedAt: "2026-07-11T00:00:00.000Z",
    summary: {
      lifetimeTokens: 14_350_000_000,
      peakDailyTokens: 700_000_000,
      longestRunningTurnSec: 27_180,
      currentStreakDays: 7,
      longestStreakDays: 49
    },
    dailyUsageBuckets: [
      { startDate: "2026-07-10", tokens: 1 }
    ]
  });

  assert.equal(output, [
    "Codex account usage",
    "",
    "Lifetime tokens    14.35B",
    "Peak daily tokens  700M",
    "Longest turn       7h 33m",
    "Current streak     7 days",
    "Longest streak     49 days",
    "Daily buckets      1 day",
    "",
    "Captured at 2026-07-11T00:00:00.000Z"
  ].join("\n"));
});

test("keeps unavailable metrics distinct from zero values", () => {
  const output = formatAccountUsage({
    capturedAt: "2026-07-11T00:00:00.000Z",
    summary: {
      lifetimeTokens: null,
      peakDailyTokens: 0,
      longestRunningTurnSec: null,
      currentStreakDays: 0,
      longestStreakDays: 1
    },
    dailyUsageBuckets: null
  });

  assert.match(output, /Lifetime tokens\s+Unavailable/u);
  assert.match(output, /Peak daily tokens\s+0/u);
  assert.match(output, /Longest turn\s+Unavailable/u);
  assert.match(output, /Current streak\s+0 days/u);
  assert.match(output, /Longest streak\s+1 day/u);
  assert.match(output, /Daily buckets\s+Unavailable/u);
});
