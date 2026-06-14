import { sampleUsageSnapshotV2 } from "./fixtures/sample-v2-snapshot.js";
import { aggregateActivityFromCodexHome } from "./parser/activity-aggregate.js";
import { aggregateModelUsageFromCodexHome } from "./parser/model-aggregate.js";
import { aggregateTokenUsageFromCodexHome } from "./parser/token-aggregate.js";
import {
  USAGE_SNAPSHOT_V2_SCHEMA_VERSION,
  assertUsageSnapshotV2
} from "./snapshot/v2-schema.js";

export const ANALYZER_NAME = "codex-usage-analyzer";
export const ANALYZER_VERSION = "0.1.0";

export async function analyzeUsage(options = {}) {
  const [usageAggregate, modelAggregate, activityAggregate] = await Promise.all([
    aggregateTokenUsageFromCodexHome(options),
    aggregateModelUsageFromCodexHome(options),
    aggregateActivityFromCodexHome(options)
  ]);

  const snapshot = createUnavailableUsageSnapshotV2({
    capturedAt: normalizeCapturedAt(options.capturedAt),
    producer: {
      name: ANALYZER_NAME,
      version: ANALYZER_VERSION
    }
  });

  if (usageAggregate.diagnostics.status === "ok") {
    snapshot.usage = usageAggregate.usage;
  }

  if (modelAggregate.diagnostics.status === "ok") {
    snapshot.models = modelAggregate.models;
  }

  if (activityAggregate.diagnostics.status === "ok") {
    snapshot.activity = activityAggregate.activity;
  }

  snapshot.extensions["codexUsageAnalyzer.diagnostics"] = createAnalyzerDiagnostics({
    activity: activityAggregate,
    models: modelAggregate,
    usage: usageAggregate
  });

  return assertUsageSnapshotV2(snapshot);
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
        reason: "local_sources_unavailable",
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

function createAnalyzerDiagnostics(aggregates) {
  const diagnostics = {
    usage: aggregates.usage.diagnostics,
    models: aggregates.models.diagnostics,
    activity: aggregates.activity.diagnostics,
    skills: {
      status: "unavailable",
      reason: "local_source_not_identified"
    },
    plugins: {
      status: "unavailable",
      reason: "local_source_not_identified"
    }
  };

  const parsedFields = [];
  const unavailableFields = ["skills", "plugins"];

  for (const field of ["usage", "models", "activity"]) {
    if (diagnostics[field].status === "ok") {
      parsedFields.push(field);
    } else {
      unavailableFields.push(field);
    }
  }

  if (diagnostics.activity.status === "ok") {
    for (const field of diagnostics.activity.unavailableFields ?? []) {
      unavailableFields.push(`activity.${field}`);
    }
  }

  const status = parsedFields.length === 0
    ? "unavailable"
    : unavailableFields.length > 0
      ? "partial"
      : "ok";

  return {
    status,
    reason: getAnalyzerDiagnosticReason(status, diagnostics),
    parser: "session_jsonl",
    source: diagnostics.usage.source,
    parsedFields,
    unavailableFields,
    ...diagnostics
  };
}

function getAnalyzerDiagnosticReason(status, diagnostics) {
  if (status === "ok") {
    return null;
  }

  if (status === "partial") {
    return "local_sources_partially_available";
  }

  return diagnostics.usage.reason
    ?? diagnostics.models.reason
    ?? diagnostics.activity.reason
    ?? "local_sources_unavailable";
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
