import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ACCOUNT_USAGE_CONTRACT_VERSION,
  ACCOUNT_USAGE_SUMMARY_FIELDS,
  normalizeAccountUsageResult
} from "../account-usage.js";
import { CODEX_USAGE_ERROR_CODES, CodexUsageError } from "../errors.js";

const CAPTURED_AT = "2026-07-11T00:00:00.000Z";
const schemaPath = fileURLToPath(
  new URL("../../docs/account-usage.schema.json", import.meta.url)
);

test("normalizes the allowlisted account usage contract", () => {
  const result = normalizeAccountUsageResult({
    identity: { username: "not-forwarded" },
    summary: {
      lifetimeTokens: 1_234_567,
      peakDailyTokens: 45_678,
      longestRunningTurnSec: 540,
      currentStreakDays: 8,
      longestStreakDays: 14,
      email: "not-forwarded"
    },
    dailyUsageBuckets: [
      {
        startDate: "2026-07-10",
        tokens: 12_345,
        accountId: "not-forwarded"
      }
    ],
    unknown: "not-forwarded"
  }, { capturedAt: CAPTURED_AT });

  assert.deepEqual(result, {
    contractVersion: ACCOUNT_USAGE_CONTRACT_VERSION,
    capturedAt: CAPTURED_AT,
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
  });
  assert.deepEqual(Object.keys(result.summary), ACCOUNT_USAGE_SUMMARY_FIELDS);
});

test("normalizes missing optional metrics and buckets to null", () => {
  const result = normalizeAccountUsageResult({
    summary: {
      currentStreakDays: 0
    }
  }, { capturedAt: CAPTURED_AT });

  assert.deepEqual(result.summary, {
    lifetimeTokens: null,
    peakDailyTokens: null,
    longestRunningTurnSec: null,
    currentStreakDays: 0,
    longestStreakDays: null
  });
  assert.equal(result.dailyUsageBuckets, null);
});

test("preserves the difference between null and an empty bucket array", () => {
  const unavailable = normalizeAccountUsageResult({
    summary: {},
    dailyUsageBuckets: null
  }, { capturedAt: CAPTURED_AT });
  const empty = normalizeAccountUsageResult({
    summary: {},
    dailyUsageBuckets: []
  }, { capturedAt: CAPTURED_AT });

  assert.equal(unavailable.dailyUsageBuckets, null);
  assert.deepEqual(empty.dailyUsageBuckets, []);
});

test("normalizes capturedAt to UTC", () => {
  const result = normalizeAccountUsageResult({ summary: {} }, {
    capturedAt: "2026-07-11T09:00:00+09:00"
  });

  assert.equal(result.capturedAt, CAPTURED_AT);
});

test("keeps the machine-readable schema aligned with the runtime contract", () => {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

  assert.deepEqual(schema.required, [
    "contractVersion",
    "capturedAt",
    "summary",
    "dailyUsageBuckets"
  ]);
  assert.deepEqual(
    schema.definitions.summary.required,
    ACCOUNT_USAGE_SUMMARY_FIELDS
  );
  assert.equal(
    schema.definitions.nullableNonNegativeInteger.oneOf[0].maximum,
    Number.MAX_SAFE_INTEGER
  );
});

test("rejects malformed account usage responses with a stable error", async (t) => {
  const cases = [
    ["missing summary", {}],
    ["summary is not an object", { summary: [] }],
    ["negative metric", { summary: { lifetimeTokens: -1 } }],
    ["unsafe metric", { summary: { lifetimeTokens: Number.MAX_SAFE_INTEGER + 1 } }],
    ["fractional metric", { summary: { lifetimeTokens: 1.5 } }],
    ["bucket collection is not an array", { summary: {}, dailyUsageBuckets: {} }],
    ["bucket date is invalid", {
      summary: {},
      dailyUsageBuckets: [{ startDate: "2026-02-30", tokens: 1 }]
    }],
    ["bucket token is missing", {
      summary: {},
      dailyUsageBuckets: [{ startDate: "2026-07-10" }]
    }]
  ];

  for (const [name, value] of cases) {
    await t.test(name, () => {
      assert.throws(
        () => normalizeAccountUsageResult(value, { capturedAt: CAPTURED_AT }),
        (error) => {
          assert.equal(error instanceof CodexUsageError, true);
          assert.equal(
            error.code,
            CODEX_USAGE_ERROR_CODES.INVALID_ACCOUNT_USAGE_RESPONSE
          );
          return true;
        }
      );
    });
  }
});
