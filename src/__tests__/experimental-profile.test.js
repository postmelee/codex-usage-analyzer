import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXPERIMENTAL_PET_FIELDS,
  EXPERIMENTAL_PET_IMAGE_FIELDS,
  FULL_PROFILE_ACTIVITY_FIELDS,
  FULL_PROFILE_CONTRACT_VERSION,
  FULL_PROFILE_FIELDS,
  FULL_PROFILE_INVOCATION_FIELDS,
  FULL_PROFILE_KIND,
  FULL_PROFILE_STABILITY,
  FULL_PROFILE_STATUSES,
  FULL_PROFILE_V2_CONTRACT_VERSION,
  FULL_PROFILE_V2_FIELDS,
  createUnavailableFullProfile,
  createUnavailableFullProfileV2,
  normalizeFullProfileResult,
  normalizeFullProfileV2Result
} from "../experimental-profile.js";
import {
  EXPERIMENTAL_PET_IMAGE_CONTENT_TYPES,
  EXPERIMENTAL_PET_REASONS,
  MAX_EXPERIMENTAL_PET_IMAGE_BYTES,
  MAX_EXPERIMENTAL_PET_IMAGE_DIMENSION
} from "../experimental-pet.js";

const CAPTURED_AT = "2026-01-01T00:00:00.000Z";
const schemaPath = fileURLToPath(
  new URL("../../docs/experimental-full-profile.schema.json", import.meta.url)
);
const schemaV2Path = fileURLToPath(
  new URL(
    "../../docs/experimental-full-profile-v2.schema.json",
    import.meta.url
  )
);
const FULL_PROFILE_V1_SCHEMA_SHA256 =
  "58c1ec318968d693aa914501938f54f8223a4064e5e94b853525f2b64d48bf09";
const FULL_PROFILE_V1_FIXTURE_SHA256 =
  "e35f588da18bf7be78a5c38025d85728e462a181b196742353c778d8af5b1deb";

test("normalizes a complete allowlisted Full Profile Envelope", () => {
  const usage = createUsage();
  const result = normalizeFullProfileResult(
    usage,
    createRemoteProfile(),
    { planType: " synthetic-plan " }
  );

  assert.deepEqual(result, {
    fullProfileContractVersion: FULL_PROFILE_CONTRACT_VERSION,
    kind: FULL_PROFILE_KIND,
    stability: FULL_PROFILE_STABILITY,
    status: "ok",
    usage,
    profile: {
      displayName: "Synthetic Name",
      username: "synthetic-user",
      avatarUrl: "https://example.invalid/avatar.png",
      planType: "synthetic-plan"
    },
    activityInsights: {
      fastModePercent: 25,
      reasoningEffort: "synthetic-effort",
      reasoningEffortPercent: 50,
      skillsExplored: 6,
      totalSkillsUsed: 7,
      totalThreads: 8,
      topInvocations: [
        {
          type: "plugin",
          name: "synthetic-plugin",
          usageCount: 9
        },
        {
          type: "skill",
          name: "synthetic-skill",
          usageCount: 10
        }
      ]
    }
  });
  assert.deepEqual(Object.keys(result.profile), FULL_PROFILE_FIELDS);
  assert.deepEqual(
    Object.keys(result.activityInsights),
    FULL_PROFILE_ACTIVITY_FIELDS
  );
  assert.deepEqual(
    Object.keys(result.activityInsights.topInvocations[0]),
    FULL_PROFILE_INVOCATION_FIELDS
  );
});

test("keeps official usage canonical and drops unknown private fields", () => {
  const usage = {
    ...createUsage(),
    identity: "synthetic-private-identity",
    summary: {
      ...createUsage().summary,
      email: "synthetic-private-email"
    },
    dailyUsageBuckets: [
      {
        startDate: "2025-12-31",
        tokens: 100,
        accountId: "synthetic-private-account"
      }
    ]
  };
  const remote = createRemoteProfile();
  remote.stats.lifetime_tokens = 999_999;
  remote.stats.peak_daily_tokens = 888_888;
  remote.identity = "synthetic-private-root";

  const result = normalizeFullProfileResult(usage, remote);
  const serialized = JSON.stringify(result);

  assert.deepEqual(result.usage, createUsage());
  assert.equal(result.usage.summary.lifetimeTokens, 1_000);
  assert.equal(serialized.includes("synthetic-private"), false);
  assert.equal(serialized.includes("999999"), false);
  assert.equal(serialized.includes("888888"), false);
});

test("returns partial with stable null fields for incomplete remote categories", () => {
  const remote = createRemoteProfile();
  remote.profile.display_name = 123;
  remote.profile.profile_picture_url = "http://example.invalid/avatar.png";
  remote.stats.fast_mode_usage_percentage = 101;
  remote.stats.most_used_reasoning_effort = "synthetic\ncontrol";
  remote.stats.unique_skills_used = Number.MAX_SAFE_INTEGER + 1;
  remote.stats.top_invocations = [
    {
      type: "plugin",
      plugin_name: "valid-plugin",
      usage_count: 1,
      plugin_id: "synthetic-private-id"
    },
    {
      type: "unknown",
      plugin_name: "invalid-plugin",
      usage_count: 2
    }
  ];
  remote.metadata.stats_error = "synthetic-upstream-detail";

  const result = normalizeFullProfileResult(createUsage(), remote, {
    planType: { invalid: true }
  });

  assert.equal(result.status, "partial");
  assert.deepEqual(result.profile, {
    displayName: null,
    username: "synthetic-user",
    avatarUrl: null,
    planType: null
  });
  assert.deepEqual(result.activityInsights, {
    fastModePercent: null,
    reasoningEffort: null,
    reasoningEffortPercent: 50,
    skillsExplored: null,
    totalSkillsUsed: 7,
    totalThreads: 8,
    topInvocations: [
      { type: "plugin", name: "valid-plugin", usageCount: 1 }
    ]
  });
  assert.equal(
    JSON.stringify(result).includes("synthetic-upstream-detail"),
    false
  );
  assert.equal(JSON.stringify(result).includes("synthetic-private-id"), false);
});

test("rounds finite private percentages to whole-percent UI values", () => {
  const remote = createRemoteProfile();
  remote.stats.fast_mode_usage_percentage = 34.6;
  remote.stats.most_used_reasoning_effort_percentage = 75.5;

  const result = normalizeFullProfileResult(createUsage(), remote, {
    planType: "synthetic-plan"
  });

  assert.equal(result.status, "ok");
  assert.equal(result.activityInsights.fastModePercent, 35);
  assert.equal(result.activityInsights.reasoningEffortPercent, 76);
});

test("distinguishes unavailable and empty top invocations", () => {
  const unavailableRemote = createRemoteProfile();
  unavailableRemote.stats.top_invocations = null;
  const unavailable = normalizeFullProfileResult(
    createUsage(),
    unavailableRemote
  );

  const emptyRemote = createRemoteProfile();
  emptyRemote.stats.top_invocations = [];
  const empty = normalizeFullProfileResult(createUsage(), emptyRemote);

  assert.equal(unavailable.status, "partial");
  assert.equal(unavailable.activityInsights.topInvocations, null);
  assert.equal(empty.status, "ok");
  assert.deepEqual(empty.activityInsights.topInvocations, []);
});

test("returns partial objects when profile or stats categories are absent", () => {
  const missingProfile = normalizeFullProfileResult(createUsage(), {
    stats: createRemoteProfile().stats,
    metadata: { stats_error: null }
  }, { planType: "synthetic-plan" });
  const missingStats = normalizeFullProfileResult(createUsage(), {
    profile: createRemoteProfile().profile,
    metadata: { stats_error: null }
  });

  assert.equal(missingProfile.status, "partial");
  assert.deepEqual(missingProfile.profile, {
    displayName: null,
    username: null,
    avatarUrl: null,
    planType: "synthetic-plan"
  });
  assert.equal(missingStats.status, "partial");
  assert.deepEqual(missingStats.activityInsights, {
    fastModePercent: null,
    reasoningEffort: null,
    reasoningEffortPercent: null,
    skillsExplored: null,
    totalSkillsUsed: null,
    totalThreads: null,
    topInvocations: null
  });
});

test("returns unavailable only when the remote root is unavailable", () => {
  for (const remote of [null, [], "synthetic-invalid-root"]) {
    const result = normalizeFullProfileResult(createUsage(), remote);

    assert.deepEqual(result, createUnavailableFullProfile(createUsage()));
    assert.equal(result.status, "unavailable");
    assert.equal(result.profile, null);
    assert.equal(result.activityInsights, null);
  }
});

test("marks invalid private stats as partial without copying their values", () => {
  const cases = [
    ["missing private summary", (remote) => {
      delete remote.stats.lifetime_tokens;
    }],
    ["invalid private summary", (remote) => {
      remote.stats.current_streak_days = -1;
    }],
    ["unavailable private daily buckets", (remote) => {
      remote.stats.daily_usage_buckets = null;
    }],
    ["invalid private daily bucket", (remote) => {
      remote.stats.daily_usage_buckets = [
        { start_date: "2026-02-30", tokens: 1 }
      ];
    }],
    ["missing metadata", (remote) => {
      delete remote.metadata;
    }]
  ];

  for (const [name, mutate] of cases) {
    const remote = createRemoteProfile();
    mutate(remote);
    const result = normalizeFullProfileResult(createUsage(), remote);

    assert.equal(result.status, "partial", name);
    assert.deepEqual(result.usage, createUsage(), name);
  }
});

test("limits top invocations and rejects unsafe rows", () => {
  const remote = createRemoteProfile();
  remote.stats.top_invocations = Array.from({ length: 101 }, (_, index) => ({
    type: "skill",
    skill_name: `synthetic-skill-${index}`,
    usage_count: index
  }));

  const result = normalizeFullProfileResult(createUsage(), remote);

  assert.equal(result.status, "partial");
  assert.equal(result.activityInsights.topInvocations.length, 100);
  assert.equal(result.activityInsights.topInvocations[99].usageCount, 99);
});

test("rejects malformed canonical usage with a generic internal error", () => {
  const cases = [
    {},
    { ...createUsage(), contractVersion: 2 },
    { ...createUsage(), capturedAt: "invalid" },
    { ...createUsage(), capturedAt: "2026-01-01" },
    { ...createUsage(), capturedAt: "2026-01-01T09:00:00+09:00" },
    { ...createUsage(), summary: { lifetimeTokens: -1 } },
    { ...createUsage(), dailyUsageBuckets: undefined },
    {
      ...createUsage(),
      dailyUsageBuckets: [{ startDate: "2026-02-30", tokens: 1 }]
    }
  ];

  for (const value of cases) {
    assert.throws(
      () => normalizeFullProfileResult(value, createRemoteProfile()),
      (error) => {
        assert.equal(error instanceof TypeError, true);
        assert.equal(error.message, "Invalid Account Usage Contract document");
        return true;
      }
    );
  }
});

test("keeps the experimental schema aligned with runtime field sets", () => {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

  assert.deepEqual(schema.required, [
    "fullProfileContractVersion",
    "kind",
    "stability",
    "status",
    "usage",
    "profile",
    "activityInsights"
  ]);
  assert.equal(
    schema.properties.fullProfileContractVersion.const,
    FULL_PROFILE_CONTRACT_VERSION
  );
  assert.equal(schema.properties.kind.const, FULL_PROFILE_KIND);
  assert.equal(schema.properties.stability.const, FULL_PROFILE_STABILITY);
  assert.deepEqual(schema.properties.status.enum, FULL_PROFILE_STATUSES);
  assert.deepEqual(schema.definitions.profile.required, FULL_PROFILE_FIELDS);
  assert.deepEqual(
    schema.definitions.activityInsights.required,
    FULL_PROFILE_ACTIVITY_FIELDS
  );
  assert.deepEqual(
    schema.definitions.topInvocation.required,
    FULL_PROFILE_INVOCATION_FIELDS
  );
  assert.equal(
    schema.definitions.nullableNonNegativeInteger.oneOf[0].maximum,
    Number.MAX_SAFE_INTEGER
  );
  assert.equal(
    schema.definitions.activityInsights.properties.topInvocations
      .oneOf[0].maxItems,
    100
  );
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.definitions.accountUsage.additionalProperties, false);
  assert.equal(schema.definitions.profile.additionalProperties, false);
  assert.equal(schema.definitions.activityInsights.additionalProperties, false);
  assert.equal(schema.definitions.topInvocation.additionalProperties, false);
});

test("preserves the Full Profile v1 field order and schema bytes", () => {
  const result = normalizeFullProfileResult(
    createUsage(),
    createRemoteProfile(),
    { planType: " synthetic-plan " }
  );
  const schemaBytes = readFileSync(schemaPath);

  assert.deepEqual(Object.keys(result), [
    "fullProfileContractVersion",
    "kind",
    "stability",
    "status",
    "usage",
    "profile",
    "activityInsights"
  ]);
  assert.equal(result.fullProfileContractVersion, 1);
  assert.equal(
    createHash("sha256").update(schemaBytes).digest("hex"),
    FULL_PROFILE_V1_SCHEMA_SHA256
  );
  assert.equal(
    createHash("sha256").update(JSON.stringify(result)).digest("hex"),
    FULL_PROFILE_V1_FIXTURE_SHA256
  );
});

test("normalizes an allowlisted Full Profile v2 pet envelope", () => {
  const pet = createAvailablePet();
  pet.unknown = "synthetic-private-pet";
  pet.image.unknown = "synthetic-private-image";

  const result = normalizeFullProfileV2Result(
    createUsage(),
    createRemoteProfile(),
    pet
  );

  assert.equal(
    result.fullProfileContractVersion,
    FULL_PROFILE_V2_CONTRACT_VERSION
  );
  assert.equal(result.status, "ok");
  assert.deepEqual(Object.keys(result), FULL_PROFILE_V2_FIELDS);
  assert.deepEqual(Object.keys(result.pet), EXPERIMENTAL_PET_FIELDS);
  assert.deepEqual(
    Object.keys(result.pet.image),
    EXPERIMENTAL_PET_IMAGE_FIELDS
  );
  assert.deepEqual(result.pet, createAvailablePet());
  assert.equal(JSON.stringify(result).includes("synthetic-private"), false);
});

test("applies the Full Profile v2 source status matrix", () => {
  const availablePet = createAvailablePet();
  const unavailablePet = createUnavailablePet();
  const partialRemote = createRemoteProfile();
  partialRemote.profile.display_name = 123;

  const cases = [
    ["ok + ok", createRemoteProfile(), availablePet, "ok"],
    ["unavailable + ok", null, availablePet, "partial"],
    ["ok + unavailable", createRemoteProfile(), unavailablePet, "partial"],
    ["partial + ok", partialRemote, availablePet, "partial"],
    ["unavailable + unavailable", null, unavailablePet, "unavailable"]
  ];

  for (const [name, remote, pet, expectedStatus] of cases) {
    const result = normalizeFullProfileV2Result(
      createUsage(),
      remote,
      pet
    );
    assert.equal(result.status, expectedStatus, name);
  }

  assert.equal(
    createUnavailableFullProfileV2(createUsage(), availablePet).status,
    "partial"
  );
  assert.equal(
    createUnavailableFullProfileV2(createUsage(), unavailablePet).status,
    "unavailable"
  );
});

test("normalizes invalid pet values to one safe unavailable shape", () => {
  const cases = [
    null,
    {},
    { ...createAvailablePet(), kind: "built-in" },
    { ...createAvailablePet(), reason: "synthetic-detail" },
    { ...createAvailablePet(), image: null },
    {
      ...createAvailablePet(),
      image: { ...createAvailablePet().image, width: 0 }
    },
    {
      ...createAvailablePet(),
      image: { ...createAvailablePet().image, byteLength: 1 }
    },
    {
      ...createAvailablePet(),
      image: { ...createAvailablePet().image, sha256: "0".repeat(64) }
    },
    {
      ...createAvailablePet(),
      image: { ...createAvailablePet().image, base64: "not-base64" }
    },
    {
      status: "unavailable",
      reason: "synthetic-detail",
      kind: null,
      image: null
    }
  ];

  for (const value of cases) {
    const result = normalizeFullProfileV2Result(
      createUsage(),
      createRemoteProfile(),
      value
    );

    assert.equal(result.status, "partial");
    assert.deepEqual(result.pet, {
      status: "unavailable",
      reason: "selected_pet_state_unavailable",
      kind: null,
      image: null
    });
    assert.equal(JSON.stringify(result).includes("synthetic-detail"), false);
  }
});

test("preserves only allowlisted unavailable pet reasons", () => {
  const pet = {
    ...createUnavailablePet("selected_pet_image_too_large"),
    unknown: "synthetic-private-pet"
  };
  const result = normalizeFullProfileV2Result(
    createUsage(),
    null,
    pet
  );

  assert.equal(result.status, "unavailable");
  assert.deepEqual(result.pet, createUnavailablePet(
    "selected_pet_image_too_large"
  ));
  assert.equal(JSON.stringify(result).includes("synthetic-private"), false);
});

test("keeps the Full Profile v2 schema aligned with runtime contracts", () => {
  const schema = JSON.parse(readFileSync(schemaV2Path, "utf8"));

  assert.deepEqual(schema.required, FULL_PROFILE_V2_FIELDS);
  assert.equal(
    schema.properties.fullProfileContractVersion.const,
    FULL_PROFILE_V2_CONTRACT_VERSION
  );
  assert.equal(schema.properties.kind.const, FULL_PROFILE_KIND);
  assert.equal(schema.properties.stability.const, FULL_PROFILE_STABILITY);
  assert.deepEqual(schema.properties.status.enum, FULL_PROFILE_STATUSES);
  assert.deepEqual(schema.definitions.pet.required, EXPERIMENTAL_PET_FIELDS);
  assert.deepEqual(
    schema.definitions.petImage.required,
    EXPERIMENTAL_PET_IMAGE_FIELDS
  );
  assert.deepEqual(
    schema.definitions.pet.properties.reason.oneOf[0].enum,
    EXPERIMENTAL_PET_REASONS
  );
  assert.deepEqual(
    schema.definitions.petImage.properties.contentType.enum,
    EXPERIMENTAL_PET_IMAGE_CONTENT_TYPES
  );
  assert.equal(
    schema.definitions.petImage.properties.width.maximum,
    MAX_EXPERIMENTAL_PET_IMAGE_DIMENSION
  );
  assert.equal(
    schema.definitions.petImage.properties.byteLength.maximum,
    MAX_EXPERIMENTAL_PET_IMAGE_BYTES
  );
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.definitions.pet.additionalProperties, false);
  assert.equal(schema.definitions.petImage.additionalProperties, false);
});

function createUsage() {
  return {
    contractVersion: 1,
    capturedAt: CAPTURED_AT,
    summary: {
      lifetimeTokens: 1_000,
      peakDailyTokens: 200,
      longestRunningTurnSec: 300,
      currentStreakDays: 4,
      longestStreakDays: 5
    },
    dailyUsageBuckets: [
      { startDate: "2025-12-31", tokens: 100 }
    ]
  };
}

function createRemoteProfile() {
  return {
    profile: {
      display_name: " Synthetic Name ",
      username: " synthetic-user ",
      profile_picture_url: "https://example.invalid/avatar.png",
      email: "synthetic-private-email"
    },
    stats: {
      lifetime_tokens: 10_000,
      peak_daily_tokens: 2_000,
      longest_running_turn_sec: 3_000,
      current_streak_days: 40,
      longest_streak_days: 50,
      daily_usage_buckets: [
        { start_date: "2025-12-31", tokens: 9_999 }
      ],
      fast_mode_usage_percentage: 25,
      most_used_reasoning_effort: "synthetic-effort",
      most_used_reasoning_effort_percentage: 50,
      unique_skills_used: 6,
      total_skills_used: 7,
      total_threads: 8,
      top_invocations: [
        {
          type: "plugin",
          plugin_id: "synthetic-private-plugin-id",
          plugin_name: "synthetic-plugin",
          usage_count: 9
        },
        {
          type: "skill",
          skill_id: "synthetic-private-skill-id",
          skill_name: "synthetic-skill",
          usage_count: 10
        }
      ]
    },
    metadata: {
      stats_error: null,
      account_id: "synthetic-private-account-id"
    },
    unknown: "synthetic-private-root"
  };
}

function createAvailablePet() {
  const bytes = Buffer.from("synthetic-pet-image", "utf8");
  return {
    status: "ok",
    reason: null,
    kind: "custom",
    image: {
      role: "spritesheet",
      contentType: "image/webp",
      width: 8,
      height: 9,
      byteLength: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      base64: bytes.toString("base64")
    }
  };
}

function createUnavailablePet(reason = "selected_pet_state_unavailable") {
  return {
    status: "unavailable",
    reason,
    kind: null,
    image: null
  };
}
