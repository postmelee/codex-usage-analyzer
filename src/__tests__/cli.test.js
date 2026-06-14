import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  sampleUsageSnapshotV2,
  validateUsageSnapshotV2
} from "../index.js";

const binPath = fileURLToPath(new URL("../../bin/codex-usage-analyzer.js", import.meta.url));
const parserFixtureCodexHome = fileURLToPath(new URL("./fixtures/parser", import.meta.url));
const missingParserFixtureCodexHome = fileURLToPath(new URL("./fixtures/parser-missing", import.meta.url));

test("prints production UsageSnapshot v2 JSON for analyze --json", () => {
  const result = spawnSync(process.execPath, [
    binPath,
    "analyze",
    "--json",
    "--codex-home",
    missingParserFixtureCodexHome
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");

  const snapshot = JSON.parse(result.stdout);
  const validation = validateUsageSnapshotV2(snapshot);

  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.equal(snapshot.usage.totalTokens, 0);
  assert.equal(snapshot.codexProfile, undefined);
  assert.equal(snapshot.codexAssets, undefined);
  assert.equal(snapshot.extensions["codexUsageAnalyzer.fixture"], undefined);
  assert.equal(
    snapshot.extensions["codexUsageAnalyzer.diagnostics"].reason,
    "session_jsonl_not_found"
  );
});

test("prints parsed production JSON for analyze --json --codex-home", () => {
  const result = spawnSync(process.execPath, [
    binPath,
    "analyze",
    "--json",
    "--codex-home",
    parserFixtureCodexHome
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");

  const snapshot = JSON.parse(result.stdout);
  const validation = validateUsageSnapshotV2(snapshot);

  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.equal(snapshot.usage.totalTokens, 6780);
  assert.equal(snapshot.models.favoriteModel.model, "gpt-5-codex");
  assert.equal(snapshot.activity.longestStreakDays, 3);
  assert.equal(snapshot.extensions["codexUsageAnalyzer.fixture"], undefined);
  assert.equal(snapshot.extensions["codexUsageAnalyzer.diagnostics"].status, "partial");
  assert.equal(result.stdout.includes(parserFixtureCodexHome), false);
  assert.equal(result.stdout.includes("lineNumber"), false);
});

test("prints sample fixture JSON only for analyze --json --fixture-sample", () => {
  const result = spawnSync(process.execPath, [binPath, "analyze", "--json", "--fixture-sample"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");

  const snapshot = JSON.parse(result.stdout);
  const validation = validateUsageSnapshotV2(snapshot);

  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.equal(snapshot.usage.totalTokens, sampleUsageSnapshotV2.usage.totalTokens);
  assert.deepEqual(snapshot.codexProfile, sampleUsageSnapshotV2.codexProfile);
  assert.deepEqual(
    snapshot.extensions["codexUsageAnalyzer.fixture"],
    sampleUsageSnapshotV2.extensions["codexUsageAnalyzer.fixture"]
  );
});

test("rejects analyze without --json", () => {
  const result = spawnSync(process.execPath, [binPath, "analyze"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /codex-usage-analyzer analyze --json/);
});

test("rejects unknown analyze flags", () => {
  const result = spawnSync(process.execPath, [binPath, "analyze", "--json", "--unknown"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /codex-usage-analyzer analyze --json --fixture-sample/);
});

test("rejects analyze with missing --codex-home value", () => {
  const result = spawnSync(process.execPath, [binPath, "analyze", "--json", "--codex-home"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /--codex-home <path>/);
});
