import { createHash } from "node:crypto";

import { ACCOUNT_USAGE_SUMMARY_FIELDS } from "./account-usage.js";
import {
  EXPERIMENTAL_PET_IMAGE_CONTENT_TYPES,
  EXPERIMENTAL_PET_REASONS,
  MAX_EXPERIMENTAL_PET_IMAGE_BYTES,
  MAX_EXPERIMENTAL_PET_IMAGE_DIMENSION,
  MAX_EXPERIMENTAL_PET_IMAGE_PIXELS
} from "./experimental-pet.js";

export const FULL_PROFILE_CONTRACT_VERSION = 1;
export const FULL_PROFILE_V2_CONTRACT_VERSION = 2;
export const FULL_PROFILE_KIND = "codex-usage-analyzer.fullProfile";
export const FULL_PROFILE_STABILITY = "experimental";

export const FULL_PROFILE_STATUSES = Object.freeze([
  "ok",
  "partial",
  "unavailable"
]);

export const FULL_PROFILE_FIELDS = Object.freeze([
  "displayName",
  "username",
  "avatarUrl",
  "planType"
]);

export const FULL_PROFILE_ACTIVITY_FIELDS = Object.freeze([
  "fastModePercent",
  "reasoningEffort",
  "reasoningEffortPercent",
  "skillsExplored",
  "totalSkillsUsed",
  "totalThreads",
  "topInvocations"
]);

export const FULL_PROFILE_INVOCATION_FIELDS = Object.freeze([
  "type",
  "name",
  "usageCount"
]);

export const FULL_PROFILE_V2_FIELDS = Object.freeze([
  "fullProfileContractVersion",
  "kind",
  "stability",
  "status",
  "usage",
  "profile",
  "activityInsights",
  "pet"
]);

export const EXPERIMENTAL_PET_FIELDS = Object.freeze([
  "status",
  "reason",
  "kind",
  "image"
]);

export const EXPERIMENTAL_PET_IMAGE_FIELDS = Object.freeze([
  "role",
  "contentType",
  "width",
  "height",
  "byteLength",
  "sha256",
  "base64"
]);

const PROFILE_STRING_LIMITS = Object.freeze({
  displayName: 256,
  username: 100,
  avatarUrl: 2_048,
  planType: 64
});

const REASONING_EFFORT_MAX_LENGTH = 64;
const INVOCATION_NAME_MAX_LENGTH = 256;
const MAX_TOP_INVOCATIONS = 100;

const PRIVATE_SUMMARY_FIELDS = Object.freeze([
  "lifetime_tokens",
  "peak_daily_tokens",
  "longest_running_turn_sec",
  "current_streak_days",
  "longest_streak_days"
]);

export function normalizeFullProfileResult(
  usageDocument,
  remoteResult,
  options = {}
) {
  const usage = normalizeUsageDocument(usageDocument);

  if (!isRecord(remoteResult)) {
    return createEnvelope("unavailable", usage, null, null);
  }

  const profileResult = normalizeProfile(
    remoteResult.profile,
    isRecord(options) ? options.planType : undefined
  );
  const activityResult = normalizeStats(remoteResult.stats);
  const metadataComplete = hasCompleteMetadata(remoteResult.metadata);
  const status = profileResult.complete
    && activityResult.complete
    && metadataComplete
    ? "ok"
    : "partial";

  return createEnvelope(
    status,
    usage,
    profileResult.value,
    activityResult.value
  );
}

export function createUnavailableFullProfile(usageDocument) {
  return createEnvelope(
    "unavailable",
    normalizeUsageDocument(usageDocument),
    null,
    null
  );
}

export function normalizeFullProfileV2Result(
  usageDocument,
  remoteResult,
  petResult,
  options = {}
) {
  const fullProfileV1 = normalizeFullProfileResult(
    usageDocument,
    remoteResult,
    options
  );
  const pet = normalizeExperimentalPet(petResult);

  return createV2Envelope(fullProfileV1, pet);
}

export function createUnavailableFullProfileV2(
  usageDocument,
  petResult = null
) {
  return createV2Envelope(
    createUnavailableFullProfile(usageDocument),
    normalizeExperimentalPet(petResult)
  );
}

function createEnvelope(status, usage, profile, activityInsights) {
  return {
    fullProfileContractVersion: FULL_PROFILE_CONTRACT_VERSION,
    kind: FULL_PROFILE_KIND,
    stability: FULL_PROFILE_STABILITY,
    status,
    usage,
    profile,
    activityInsights
  };
}

function createV2Envelope(fullProfileV1, pet) {
  return {
    fullProfileContractVersion: FULL_PROFILE_V2_CONTRACT_VERSION,
    kind: fullProfileV1.kind,
    stability: fullProfileV1.stability,
    status: resolveFullProfileV2Status(fullProfileV1.status, pet.status),
    usage: fullProfileV1.usage,
    profile: fullProfileV1.profile,
    activityInsights: fullProfileV1.activityInsights,
    pet
  };
}

function resolveFullProfileV2Status(remoteStatus, petStatus) {
  if (remoteStatus === "ok" && petStatus === "ok") return "ok";
  if (remoteStatus === "unavailable" && petStatus === "unavailable") {
    return "unavailable";
  }
  return "partial";
}

function normalizeExperimentalPet(value) {
  if (!isRecord(value)) return unavailableExperimentalPet();

  if (value.status === "unavailable"
    && EXPERIMENTAL_PET_REASONS.includes(value.reason)
    && value.kind === null
    && value.image === null) {
    return {
      status: "unavailable",
      reason: value.reason,
      kind: null,
      image: null
    };
  }

  if (value.status !== "ok"
    || value.reason !== null
    || value.kind !== "custom") {
    return unavailableExperimentalPet();
  }

  const image = normalizeExperimentalPetImage(value.image);
  if (image === null) return unavailableExperimentalPet();

  return {
    status: "ok",
    reason: null,
    kind: "custom",
    image
  };
}

function normalizeExperimentalPetImage(value) {
  if (!isRecord(value)
    || value.role !== "spritesheet"
    || !EXPERIMENTAL_PET_IMAGE_CONTENT_TYPES.includes(value.contentType)
    || !isPositiveBoundedInteger(
      value.width,
      MAX_EXPERIMENTAL_PET_IMAGE_DIMENSION
    )
    || !isPositiveBoundedInteger(
      value.height,
      MAX_EXPERIMENTAL_PET_IMAGE_DIMENSION
    )
    || value.width * value.height > MAX_EXPERIMENTAL_PET_IMAGE_PIXELS
    || !isPositiveBoundedInteger(
      value.byteLength,
      MAX_EXPERIMENTAL_PET_IMAGE_BYTES
    )
    || typeof value.sha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(value.sha256)
    || typeof value.base64 !== "string"
    || !isStrictBase64(value.base64)) {
    return null;
  }

  const bytes = Buffer.from(value.base64, "base64");
  if (bytes.byteLength !== value.byteLength
    || createHash("sha256").update(bytes).digest("hex") !== value.sha256) {
    return null;
  }

  return {
    role: "spritesheet",
    contentType: value.contentType,
    width: value.width,
    height: value.height,
    byteLength: value.byteLength,
    sha256: value.sha256,
    base64: value.base64
  };
}

function unavailableExperimentalPet() {
  return {
    status: "unavailable",
    reason: "selected_pet_state_unavailable",
    kind: null,
    image: null
  };
}

function isPositiveBoundedInteger(value, maximum) {
  return Number.isSafeInteger(value) && value >= 1 && value <= maximum;
}

function isStrictBase64(value) {
  return value.length >= 4
    && value.length <= 11_184_812
    && value.length % 4 === 0
    && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u
      .test(value);
}

function normalizeProfile(value, planType) {
  const normalizedPlanType = normalizeOptionalString(
    planType,
    PROFILE_STRING_LIMITS.planType
  );

  if (!isRecord(value)) {
    return {
      complete: false,
      value: {
        displayName: null,
        username: null,
        avatarUrl: null,
        planType: normalizedPlanType.value
      }
    };
  }

  const displayName = normalizeOptionalString(
    value.display_name,
    PROFILE_STRING_LIMITS.displayName
  );
  const username = normalizeOptionalString(
    value.username,
    PROFILE_STRING_LIMITS.username
  );
  const avatarUrl = normalizeAvatarUrl(value.profile_picture_url);

  return {
    complete: displayName.valid && username.valid && avatarUrl.valid,
    value: {
      displayName: displayName.value,
      username: username.value,
      avatarUrl: avatarUrl.value,
      planType: normalizedPlanType.value
    }
  };
}

function normalizeStats(value) {
  if (!isRecord(value)) {
    return {
      complete: false,
      value: emptyActivityInsights()
    };
  }

  const privateSummaryComplete = PRIVATE_SUMMARY_FIELDS.every((field) => (
    normalizeRequiredInteger(value[field]).valid
  ));
  const privateDailyComplete = hasValidPrivateDailyBuckets(
    value.daily_usage_buckets
  );
  const fastModePercent = normalizePercentage(
    value.fast_mode_usage_percentage
  );
  const reasoningEffort = normalizeRequiredString(
    value.most_used_reasoning_effort,
    REASONING_EFFORT_MAX_LENGTH
  );
  const reasoningEffortPercent = normalizePercentage(
    value.most_used_reasoning_effort_percentage
  );
  const skillsExplored = normalizeRequiredInteger(value.unique_skills_used);
  const totalSkillsUsed = normalizeRequiredInteger(value.total_skills_used);
  const totalThreads = normalizeRequiredInteger(value.total_threads);
  const topInvocations = normalizeTopInvocations(value.top_invocations);

  return {
    complete: privateSummaryComplete
      && privateDailyComplete
      && fastModePercent.valid
      && reasoningEffort.valid
      && reasoningEffortPercent.valid
      && skillsExplored.valid
      && totalSkillsUsed.valid
      && totalThreads.valid
      && topInvocations.valid,
    value: {
      fastModePercent: fastModePercent.value,
      reasoningEffort: reasoningEffort.value,
      reasoningEffortPercent: reasoningEffortPercent.value,
      skillsExplored: skillsExplored.value,
      totalSkillsUsed: totalSkillsUsed.value,
      totalThreads: totalThreads.value,
      topInvocations: topInvocations.value
    }
  };
}

function emptyActivityInsights() {
  return {
    fastModePercent: null,
    reasoningEffort: null,
    reasoningEffortPercent: null,
    skillsExplored: null,
    totalSkillsUsed: null,
    totalThreads: null,
    topInvocations: null
  };
}

function normalizeTopInvocations(value) {
  if (value === undefined || value === null) {
    return { valid: false, value: null };
  }

  if (!Array.isArray(value)) {
    return { valid: false, value: null };
  }

  let valid = value.length <= MAX_TOP_INVOCATIONS;
  const normalized = [];

  for (const item of value.slice(0, MAX_TOP_INVOCATIONS)) {
    const invocation = normalizeInvocation(item);
    if (invocation === null) {
      valid = false;
    } else {
      normalized.push(invocation);
    }
  }

  return { valid, value: normalized };
}

function normalizeInvocation(value) {
  if (!isRecord(value) || (value.type !== "plugin" && value.type !== "skill")) {
    return null;
  }

  const name = normalizeRequiredString(
    value.type === "plugin" ? value.plugin_name : value.skill_name,
    INVOCATION_NAME_MAX_LENGTH
  );
  const usageCount = normalizeRequiredInteger(value.usage_count);

  if (!name.valid || !usageCount.valid) {
    return null;
  }

  return {
    type: value.type,
    name: name.value,
    usageCount: usageCount.value
  };
}

function hasCompleteMetadata(value) {
  if (!isRecord(value)) return false;

  if (value.stats_error === undefined || value.stats_error === null) {
    return true;
  }

  if (typeof value.stats_error !== "string") {
    return false;
  }

  return value.stats_error.trim().length === 0;
}

function hasValidPrivateDailyBuckets(value) {
  if (!Array.isArray(value)) return false;

  return value.every((bucket) => (
    isRecord(bucket)
    && isDateOnly(bucket.start_date)
    && normalizeRequiredInteger(bucket.tokens).valid
  ));
}

function normalizeUsageDocument(value) {
  if (!isRecord(value)
    || value.contractVersion !== 1
    || !isTimestamp(value.capturedAt)
    || !isRecord(value.summary)) {
    throw invalidUsageDocument();
  }

  const summary = {};
  for (const field of ACCOUNT_USAGE_SUMMARY_FIELDS) {
    const metric = normalizeNullableInteger(value.summary[field]);
    if (!metric.valid) throw invalidUsageDocument();
    summary[field] = metric.value;
  }

  return {
    contractVersion: 1,
    capturedAt: value.capturedAt,
    summary,
    dailyUsageBuckets: normalizeUsageBuckets(value.dailyUsageBuckets)
  };
}

function normalizeUsageBuckets(value) {
  if (value === null) return null;
  if (!Array.isArray(value)) throw invalidUsageDocument();

  return value.map((bucket) => {
    if (!isRecord(bucket) || !isDateOnly(bucket.startDate)) {
      throw invalidUsageDocument();
    }

    const tokens = normalizeRequiredInteger(bucket.tokens);
    if (!tokens.valid) throw invalidUsageDocument();

    return {
      startDate: bucket.startDate,
      tokens: tokens.value
    };
  });
}

function normalizeAvatarUrl(value) {
  const normalized = normalizeOptionalString(
    value,
    PROFILE_STRING_LIMITS.avatarUrl
  );

  if (!normalized.valid || normalized.value === null) {
    return normalized;
  }

  try {
    const url = new URL(normalized.value);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") {
      return { valid: false, value: null };
    }
  } catch {
    return { valid: false, value: null };
  }

  return normalized;
}

function normalizeOptionalString(value, maxLength) {
  if (value === undefined || value === null) {
    return { valid: true, value: null };
  }

  if (typeof value !== "string") {
    return { valid: false, value: null };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { valid: true, value: null };
  }

  if (trimmed.length > maxLength || hasControlCharacter(trimmed)) {
    return { valid: false, value: null };
  }

  return { valid: true, value: trimmed };
}

function normalizeRequiredString(value, maxLength) {
  const normalized = normalizeOptionalString(value, maxLength);
  if (normalized.value === null) {
    return { valid: false, value: null };
  }
  return normalized;
}

function normalizePercentage(value) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { valid: false, value: null };
  }
  return { valid: true, value: Math.round(value) };
}

function normalizeNullableInteger(value) {
  if (value === null) return { valid: true, value: null };
  return normalizeRequiredInteger(value);
}

function normalizeRequiredInteger(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    return { valid: false, value: null };
  }
  return { valid: true, value };
}

function hasControlCharacter(value) {
  return /[\u0000-\u001f\u007f]/u.test(value);
}

function isTimestamp(value) {
  if (typeof value !== "string") return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
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

function invalidUsageDocument() {
  return new TypeError("Invalid Account Usage Contract document");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
