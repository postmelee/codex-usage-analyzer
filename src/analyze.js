import { sampleUsageSnapshotV2 } from "./fixtures/sample-v2-snapshot.js";
import {
  USAGE_SNAPSHOT_V2_SCHEMA_VERSION,
  assertUsageSnapshotV2
} from "./snapshot/v2-schema.js";

export const ANALYZER_NAME = "codex-usage-analyzer";
export const ANALYZER_VERSION = "0.1.0";

export async function analyzeUsage(options = {}) {
  return assertUsageSnapshotV2(createUnavailableUsageSnapshotV2({
    capturedAt: normalizeCapturedAt(options.capturedAt),
    producer: {
      name: ANALYZER_NAME,
      version: ANALYZER_VERSION
    }
  }));
}

function createUnavailableUsageSnapshotV2(overrides = {}) {
  return mergeSnapshot({
    schemaVersion: USAGE_SNAPSHOT_V2_SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    producer: {
      name: ANALYZER_NAME,
      version: ANALYZER_VERSION
    },
    usage: {
      totalTokens: 0,
      peakDailyTokens: null,
      tokenBreakdown: createUnavailableTokenBreakdown(),
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
        status: "unavailable",
        reason: "local_parser_not_implemented",
        unavailableFields: ["usage", "models", "activity", "skills", "plugins"]
      }
    }
  }, overrides);
}

function createUnavailableTokenBreakdown() {
  return {
    inputTokens: null,
    outputTokens: null,
    cacheReadTokens: null,
    cacheWriteTokens: null,
    reasoningTokens: null
  };
}

export function createSampleUsageSnapshotV2(overrides = {}) {
  return mergeSnapshot(structuredClone(sampleUsageSnapshotV2), overrides);
}

function normalizeCapturedAt(value) {
  if (value === undefined || value === null) {
    return new Date().toISOString();
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError("capturedAt must be a valid date");
  }

  return date.toISOString();
}

function mergeSnapshot(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(target[key])) {
      target[key] = mergeSnapshot(target[key], value);
    } else {
      target[key] = value;
    }
  }

  return target;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
