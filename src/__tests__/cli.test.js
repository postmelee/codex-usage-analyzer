import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  sampleUsageSnapshotV2,
  validateUsageSnapshotV2
} from "../index.js";

const binPath = fileURLToPath(new URL("../../bin/codex-usage-analyzer.js", import.meta.url));

test("prints production UsageSnapshot v2 JSON for analyze --json", () => {
  const result = spawnSync(process.execPath, [binPath, "analyze", "--json"], {
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
    "local_parser_not_implemented"
  );
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
