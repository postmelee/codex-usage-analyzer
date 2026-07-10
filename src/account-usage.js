import { requestAccountUsageFromAppServer } from "./app-server-client.js";
import { CODEX_USAGE_ERROR_CODES, CodexUsageError } from "./errors.js";

export const ACCOUNT_USAGE_CONTRACT_VERSION = 1;

export const ACCOUNT_USAGE_SUMMARY_FIELDS = Object.freeze([
  "lifetimeTokens",
  "peakDailyTokens",
  "longestRunningTurnSec",
  "currentStreakDays",
  "longestStreakDays"
]);

export async function readAccountUsage(options = {}) {
  const result = await requestAccountUsageFromAppServer({
    timeoutMs: options.timeoutMs,
    spawnProcess: options.spawnProcess
  });

  return normalizeAccountUsageResult(result);
}

export function normalizeAccountUsageResult(result, options = {}) {
  if (!isRecord(result) || !isRecord(result.summary)) {
    throw invalidResponse();
  }

  const summary = {};
  for (const field of ACCOUNT_USAGE_SUMMARY_FIELDS) {
    summary[field] = normalizeNullableInteger(result.summary[field]);
  }

  return {
    contractVersion: ACCOUNT_USAGE_CONTRACT_VERSION,
    capturedAt: normalizeCapturedAt(options.capturedAt),
    summary,
    dailyUsageBuckets: normalizeDailyUsageBuckets(result.dailyUsageBuckets)
  };
}

function normalizeDailyUsageBuckets(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    throw invalidResponse();
  }

  return value.map((bucket) => {
    if (!isRecord(bucket) || !isDateOnly(bucket.startDate)) {
      throw invalidResponse();
    }

    return {
      startDate: bucket.startDate,
      tokens: normalizeRequiredInteger(bucket.tokens)
    };
  });
}

function normalizeNullableInteger(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return normalizeRequiredInteger(value);
}

function normalizeRequiredInteger(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw invalidResponse();
  }

  return value;
}

function normalizeCapturedAt(value) {
  if (value === undefined) {
    return new Date().toISOString();
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw invalidResponse();
  }

  return date.toISOString();
}

function isDateOnly(value) {
  if (typeof value !== "string") return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function invalidResponse() {
  return new CodexUsageError(
    CODEX_USAGE_ERROR_CODES.INVALID_ACCOUNT_USAGE_RESPONSE
  );
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
