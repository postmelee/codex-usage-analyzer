import { readFileSync } from "node:fs";

import { validateUsageSnapshotV2 } from "./snapshot/v2-schema.js";

export const PROFILE_BASELINE_SCHEMA_VERSION = 1;

const COMPARISON_FIELDS = [
  "usage.totalTokens",
  "usage.peakDailyTokens",
  "usage.tokenBreakdown.inputTokens",
  "usage.tokenBreakdown.outputTokens",
  "usage.tokenBreakdown.cacheReadTokens",
  "usage.tokenBreakdown.cacheWriteTokens",
  "usage.tokenBreakdown.reasoningTokens",
  "activity.currentStreakDays",
  "activity.longestStreakDays",
  "activity.longestTaskDurationMs",
  "activity.fastModePercent",
  "activity.reasoningEffort",
  "activity.reasoningEffortPercent",
  "activity.totalThreads",
  "models.favoriteModel.model",
  "skills.exploredCount",
  "skills.totalUsed",
  "skills.topSkills",
  "plugins.topPlugins"
];

const RANKING_FIELD_PATHS = new Set([
  "skills.topSkills",
  "plugins.topPlugins"
]);

const SENSITIVE_KEY_PATTERN =
  /access[_-]?token|refresh[_-]?token|authorization|password|secret|session[_-]?id|thread[_-]?id|prompt|response|tool[_-]?input|tool[_-]?output|screenshot|image[_-]?path|local[_-]?path/i;
const SENSITIVE_STRING_PATTERN =
  /\/Users\/|\/home\/|\/private\/var\/|access_token|refresh_token|Bearer |sk-|github_pat_|npm_[A-Za-z0-9]|session[_-]?id|thread[_-]?id|data:image|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function loadProfileBaseline(filePath) {
  return readJsonFile(filePath, "baseline_file_read_failed", "baseline_json_invalid");
}

export function loadUsageSnapshot(filePath) {
  return readJsonFile(filePath, "snapshot_file_read_failed", "snapshot_json_invalid");
}

export function validateProfileBaseline(baseline) {
  const errors = [];

  if (!isPlainObject(baseline)) {
    return {
      ok: false,
      errors: ["baseline must be an object"]
    };
  }

  if (baseline.schemaVersion !== PROFILE_BASELINE_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PROFILE_BASELINE_SCHEMA_VERSION}`);
  }

  if (typeof baseline.source !== "string" || baseline.source.length === 0) {
    errors.push("source must be a non-empty string");
  }

  if (!isIsoTimestamp(baseline.capturedProfileAt)) {
    errors.push("capturedProfileAt must be an ISO timestamp string");
  }

  if (typeof baseline.profileDateBasis !== "string" || baseline.profileDateBasis.length === 0) {
    errors.push("profileDateBasis must be a non-empty string");
  }

  if (!isPlainObject(baseline.expected)) {
    errors.push("expected must be an object");
  }

  if (baseline.tolerances !== undefined && !isPlainObject(baseline.tolerances)) {
    errors.push("tolerances must be an object when provided");
  } else if (isPlainObject(baseline.tolerances)) {
    for (const [fieldPath, tolerance] of Object.entries(baseline.tolerances)) {
      if (!isPlainObject(tolerance)) {
        errors.push(`tolerances.${fieldPath} must be an object`);
        continue;
      }

      const hasAbsolute = tolerance.absolute !== undefined;
      const hasRelative = tolerance.relativePercent !== undefined;

      if (!hasAbsolute && !hasRelative) {
        errors.push(`tolerances.${fieldPath} must define absolute or relativePercent`);
      }

      if (hasAbsolute && (!Number.isFinite(tolerance.absolute) || tolerance.absolute < 0)) {
        errors.push(`tolerances.${fieldPath}.absolute must be a non-negative number`);
      }

      if (
        hasRelative
        && (!Number.isFinite(tolerance.relativePercent) || tolerance.relativePercent < 0)
      ) {
        errors.push(`tolerances.${fieldPath}.relativePercent must be a non-negative number`);
      }
    }
  }

  collectSensitiveValues(baseline, "baseline", errors);

  return {
    ok: errors.length === 0,
    errors
  };
}

export function compareProfileBaseline(snapshot, baseline) {
  const baselineValidation = validateProfileBaseline(baseline);

  if (!baselineValidation.ok) {
    return createTerminalResult("invalid_baseline", "baseline_validation_failed", baselineValidation.errors);
  }

  const snapshotValidation = validateUsageSnapshotV2(snapshot);

  if (!snapshotValidation.ok) {
    return createTerminalResult("invalid_snapshot", "snapshot_validation_failed", snapshotValidation.errors);
  }

  if (snapshot.extensions?.["codexUsageAnalyzer.fixture"] !== undefined) {
    return createTerminalResult("invalid_snapshot", "sample_fixture_not_allowed", [
      "fixture sample snapshots cannot be used for profile parity smoke"
    ]);
  }

  const results = [];

  for (const fieldPath of COMPARISON_FIELDS) {
    const expected = getValueAtPath(baseline.expected, fieldPath);

    if (!expected.exists) {
      results.push(createComparisonResult(fieldPath, "skipped", "expected_field_absent"));
      continue;
    }

    if (isNotComparableMarker(expected.value)) {
      results.push(createComparisonResult(
        fieldPath,
        "not_comparable",
        expected.value.reason ?? "baseline_marked_not_comparable"
      ));
      continue;
    }

    if (RANKING_FIELD_PATHS.has(fieldPath)) {
      results.push(...compareRankingField(snapshot, fieldPath, expected.value));
      continue;
    }

    const actual = getValueAtPath(snapshot, fieldPath);
    results.push(compareScalarField({
      fieldPath,
      expected: expected.value,
      actual: actual.value,
      actualExists: actual.exists,
      tolerance: baseline.tolerances?.[fieldPath],
      snapshot
    }));
  }

  return createAggregateResult(results);
}

export function formatProfileSmokeSummary(result) {
  return {
    status: result.status,
    reason: result.reason,
    summary: result.summary,
    results: result.results
  };
}

function readJsonFile(filePath, readFailureCode, parseFailureCode) {
  let content;

  try {
    content = readFileSync(filePath, "utf8");
  } catch (error) {
    throw createProfileSmokeError(readFailureCode, error);
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw createProfileSmokeError(parseFailureCode, error);
  }
}

function createProfileSmokeError(code, cause) {
  const error = new Error(code);
  error.code = code;
  error.cause = cause;
  return error;
}

function createTerminalResult(status, reason, errors) {
  return {
    status,
    reason,
    summary: {
      total: 0,
      matched: 0,
      withinTolerance: 0,
      mismatched: 0,
      notComparable: 0,
      skipped: 0
    },
    results: errors.map((message) => ({
      field: null,
      status,
      reason,
      message
    }))
  };
}

function compareRankingField(snapshot, fieldPath, expectedValue) {
  const actual = getValueAtPath(snapshot, fieldPath);

  if (!Array.isArray(expectedValue)) {
    return [
      createComparisonResult(fieldPath, "mismatch", "expected_ranking_must_be_array", {
        expected: toSafeValue(expectedValue),
        actual: toSafeValue(actual.value)
      })
    ];
  }

  if (!actual.exists || !Array.isArray(actual.value)) {
    return [
      createComparisonResult(fieldPath, "mismatch", "actual_ranking_unavailable", {
        expected: toSafeValue(expectedValue),
        actual: toSafeValue(actual.value)
      })
    ];
  }

  if (expectedValue.length === 0) {
    return [
      createComparisonResult(fieldPath, actual.value.length === 0 ? "match" : "mismatch", (
        actual.value.length === 0 ? "empty_ranking_matches" : "actual_ranking_not_empty"
      ), {
        expected: 0,
        actual: actual.value.length
      })
    ];
  }

  const results = [];

  expectedValue.forEach((expectedItem, index) => {
    const actualItem = actual.value[index];

    if (!isPlainObject(expectedItem)) {
      results.push(createComparisonResult(
        `${fieldPath}[${index}]`,
        "mismatch",
        "expected_ranking_item_must_be_object"
      ));
      return;
    }

    if (!isPlainObject(actualItem)) {
      results.push(createComparisonResult(
        `${fieldPath}[${index}]`,
        "mismatch",
        "actual_ranking_item_missing",
        {
          expected: toSafeValue(expectedItem),
          actual: null
        }
      ));
      return;
    }

    for (const key of Object.keys(expectedItem)) {
      if (key === "status" || key === "reason") {
        continue;
      }

      results.push(compareScalarField({
        fieldPath: `${fieldPath}[${index}].${key}`,
        expected: expectedItem[key],
        actual: actualItem[key],
        actualExists: Object.hasOwn(actualItem, key),
        tolerance: null,
        snapshot
      }));
    }
  });

  return results;
}

function compareScalarField({
  fieldPath,
  expected,
  actual,
  actualExists,
  tolerance,
  snapshot
}) {
  if (!actualExists) {
    return createComparisonResult(fieldPath, "mismatch", "actual_field_absent", {
      expected: toSafeValue(expected),
      actual: null
    });
  }

  if (typeof expected === "number" && typeof actual === "number") {
    const difference = Math.abs(actual - expected);

    if (difference === 0) {
      return createComparisonResult(fieldPath, "match", "exact_match", {
        expected,
        actual
      });
    }

    if (isWithinTolerance(expected, actual, tolerance)) {
      return createComparisonResult(fieldPath, "within_tolerance", "numeric_within_tolerance", {
        expected,
        actual
      });
    }

    return createComparisonResult(fieldPath, "mismatch", "numeric_mismatch", {
      expected,
      actual
    });
  }

  if (Object.is(expected, actual)) {
    return createComparisonResult(fieldPath, "match", "exact_match", {
      expected: toSafeValue(expected),
      actual: toSafeValue(actual)
    });
  }

  return createComparisonResult(fieldPath, "mismatch", getMismatchReason(fieldPath, snapshot), {
    expected: toSafeValue(expected),
    actual: toSafeValue(actual)
  });
}

function getMismatchReason(fieldPath, snapshot) {
  if (
    fieldPath.startsWith("activity.")
    && snapshot.extensions?.["codexUsageAnalyzer.diagnostics"]?.profileComparison?.parity
      === "not_guaranteed"
  ) {
    return "profile_parity_not_guaranteed";
  }

  return "value_mismatch";
}

function isWithinTolerance(expected, actual, tolerance) {
  if (!isPlainObject(tolerance)) {
    return false;
  }

  const difference = Math.abs(actual - expected);

  if (Number.isFinite(tolerance.absolute) && difference <= tolerance.absolute) {
    return true;
  }

  if (!Number.isFinite(tolerance.relativePercent)) {
    return false;
  }

  if (expected === 0) {
    return difference === 0;
  }

  return (difference / Math.abs(expected)) * 100 <= tolerance.relativePercent;
}

function createComparisonResult(field, status, reason, values = {}) {
  return {
    field,
    status,
    reason,
    ...values
  };
}

function createAggregateResult(results) {
  const summary = {
    total: results.length,
    matched: countStatus(results, "match"),
    withinTolerance: countStatus(results, "within_tolerance"),
    mismatched: countStatus(results, "mismatch"),
    notComparable: countStatus(results, "not_comparable"),
    skipped: countStatus(results, "skipped")
  };

  const comparableCount = summary.matched + summary.withinTolerance + summary.mismatched;
  const status = summary.mismatched > 0
    ? "failed"
    : comparableCount > 0
      ? "ok"
      : "not_comparable";

  return {
    status,
    reason: getAggregateReason(status),
    summary,
    results
  };
}

function countStatus(results, status) {
  return results.filter((result) => result.status === status).length;
}

function getAggregateReason(status) {
  if (status === "ok") {
    return null;
  }

  if (status === "failed") {
    return "comparison_mismatch";
  }

  return "no_comparable_fields";
}

function isNotComparableMarker(value) {
  return isPlainObject(value) && value.status === "not_comparable";
}

function getValueAtPath(value, fieldPath) {
  const parts = fieldPath.split(".");
  let current = value;

  for (const part of parts) {
    if (current === null) {
      return { exists: true, value: null };
    }

    if (!isPlainObject(current) && !Array.isArray(current)) {
      return { exists: false, value: undefined };
    }

    if (!Object.hasOwn(current, part)) {
      return { exists: false, value: undefined };
    }

    current = current[part];
  }

  return {
    exists: true,
    value: current
  };
}

function collectSensitiveValues(value, path, errors) {
  if (typeof value === "string") {
    if (SENSITIVE_STRING_PATTERN.test(value)) {
      errors.push(`${path} contains a sensitive-looking string`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectSensitiveValues(item, `${path}[${index}]`, errors);
    });
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;

    if (SENSITIVE_KEY_PATTERN.test(key)) {
      errors.push(`${nestedPath} uses a sensitive-looking key`);
    }

    collectSensitiveValues(nestedValue, nestedPath, errors);
  }
}

function isIsoTimestamp(value) {
  if (typeof value !== "string") {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function toSafeValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return SENSITIVE_STRING_PATTERN.test(value) ? "[redacted]" : value;
  }

  if (Array.isArray(value)) {
    return `[array:${value.length}]`;
  }

  return "[object]";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
