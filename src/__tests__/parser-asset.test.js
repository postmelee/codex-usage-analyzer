import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  aggregateCodexAssetsFromCodexHome,
  BUILT_IN_CODEX_PETS
} from "../parser/asset-aggregate.js";
import { validateUsageSnapshotV2 } from "../snapshot/v2-schema.js";

const safeAssetFixtureDir = fileURLToPath(new URL("./fixtures/assets", import.meta.url));
const emptyAssetFixtureDir = fileURLToPath(new URL("./fixtures/assets-empty", import.meta.url));
const unsafeAssetFixtureDir = fileURLToPath(new URL("./fixtures/assets-unsafe", import.meta.url));

test("returns selected custom pet as an opaque local pet reference", async () => {
  const aggregate = await aggregateCodexAssetsFromCodexHome({
    codexHome: safeAssetFixtureDir
  });

  assert.deepEqual(aggregate.codexAssets, {
    avatar: null,
    pet: {
      kind: "codex-asset",
      url: null,
      assetRef: "codex-local:pet:custom-selected",
      contentType: "image/webp"
    }
  });
  assert.equal(aggregate.diagnostics.status, "ok");
  assert.equal(aggregate.diagnostics.pet.kind, "custom");
  assert.equal(aggregate.diagnostics.pet.selectedId, null);
  assert.equal(aggregate.diagnostics.pet.selectedIdRedacted, true);
  assert.equal(aggregate.diagnostics.customPetCount, 1);
  assert.equal(JSON.stringify(aggregate).includes(safeAssetFixtureDir), false);
  assert.equal(JSON.stringify(aggregate).includes("synthetic"), false);
});

test("falls back to the built-in Codex pet when selected state is absent", async () => {
  const aggregate = await aggregateCodexAssetsFromCodexHome({
    codexHome: emptyAssetFixtureDir
  });

  assert.deepEqual(aggregate.codexAssets, {
    avatar: null,
    pet: {
      kind: "codex-asset",
      url: null,
      assetRef: "codex-built-in:pet:codex",
      contentType: "image/webp"
    }
  });
  assert.equal(aggregate.diagnostics.pet.kind, "builtin");
  assert.equal(aggregate.diagnostics.pet.reason, "default_selected_avatar");
  assert.equal(aggregate.diagnostics.pet.selectedId, "codex");
  assert.equal(aggregate.diagnostics.builtInPetCount, BUILT_IN_CODEX_PETS.length);
  assert.equal(aggregate.diagnostics.customPetCount, 0);
});

test("returns selected built-in pet from persisted atom state", async () => {
  const codexHome = await mkdtemp(join(tmpdir(), "codex-usage-assets-"));
  try {
    await writeFile(join(codexHome, ".codex-global-state.json"), JSON.stringify({
      "electron-persisted-atom-state": {
        "selected-avatar-id": "dewey"
      }
    }));

    const aggregate = await aggregateCodexAssetsFromCodexHome({ codexHome });

    assert.equal(aggregate.codexAssets.pet.assetRef, "codex-built-in:pet:dewey");
    assert.equal(aggregate.codexAssets.pet.contentType, "image/webp");
    assert.equal(aggregate.diagnostics.pet.kind, "builtin");
    assert.equal(aggregate.diagnostics.pet.selectedId, "dewey");
    assert.equal(aggregate.diagnostics.pet.selectedSource, "persisted_atom");
  } finally {
    await rm(codexHome, { force: true, recursive: true });
  }
});

test("does not promote generated images to codexAssets", async () => {
  const aggregate = await aggregateCodexAssetsFromCodexHome({
    codexHome: unsafeAssetFixtureDir
  });

  assert.equal(aggregate.codexAssets.pet.assetRef, "codex-built-in:pet:codex");
  assert.equal(aggregate.diagnostics.customPetCount, 0);
  assert.equal(aggregate.diagnostics.excludedCandidateCount, 1);
  assert.deepEqual(aggregate.diagnostics.excludedSources, ["generated_images"]);
});

test("falls back to built-in Codex when selected custom pet is unavailable", async () => {
  const codexHome = await mkdtemp(join(tmpdir(), "codex-usage-assets-"));
  try {
    await mkdir(join(codexHome, "pets"), { recursive: true });
    await writeFile(join(codexHome, ".codex-global-state.json"), JSON.stringify({
      "electron-persisted-atom-state": {
        "selected-avatar-id": "custom:missing"
      }
    }));

    const aggregate = await aggregateCodexAssetsFromCodexHome({ codexHome });

    assert.equal(aggregate.codexAssets.pet.assetRef, "codex-built-in:pet:codex");
    assert.equal(aggregate.diagnostics.pet.kind, "builtin");
    assert.equal(aggregate.diagnostics.pet.reason, "selected_avatar_not_found_fallback");
    assert.equal(JSON.stringify(aggregate).includes("missing"), false);
  } finally {
    await rm(codexHome, { force: true, recursive: true });
  }
});

test("asset aggregate output is valid inside UsageSnapshot v2 codexAssets", async () => {
  const aggregate = await aggregateCodexAssetsFromCodexHome({
    codexHome: safeAssetFixtureDir
  });
  const snapshot = {
    schemaVersion: 2,
    capturedAt: "2026-06-16T00:00:00.000Z",
    usage: {
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
    codexAssets: aggregate.codexAssets
  };
  const validation = validateUsageSnapshotV2(snapshot);

  assert.equal(validation.ok, true, validation.errors.join("\n"));
});
