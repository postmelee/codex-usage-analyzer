import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as sdk from "../index.js";

const packagePath = fileURLToPath(new URL("../../package.json", import.meta.url));

test("exports only the public account usage SDK surface", () => {
  assert.deepEqual(Object.keys(sdk).sort(), [
    "ACCOUNT_USAGE_CONTRACT_VERSION",
    "ACCOUNT_USAGE_SUMMARY_FIELDS",
    "CODEX_USAGE_ERROR_CODES",
    "CodexUsageError",
    "PACKAGE_NAME",
    "PACKAGE_VERSION",
    "readAccountUsage",
    "runCli"
  ].sort());
  assert.equal(sdk.PACKAGE_NAME, "codex-usage-analyzer");
  assert.equal(sdk.PACKAGE_VERSION, "0.4.0");
  assert.equal(sdk.ACCOUNT_USAGE_CONTRACT_VERSION, 1);
  assert.equal(typeof sdk.readAccountUsage, "function");
});

test("keeps package metadata and artifact allowlist aligned with the CLI and SDK", () => {
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

  assert.equal(packageJson.name, sdk.PACKAGE_NAME);
  assert.equal(packageJson.version, sdk.PACKAGE_VERSION);
  assert.equal(packageJson.types, "./src/index.d.ts");
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./src/index.d.ts",
      import: "./src/index.js"
    }
  });
  assert.deepEqual(packageJson.dependencies ?? {}, {});

  const paths = new Set(packageJson.files);
  for (const required of [
    "bin",
    "docs",
    "src/account-usage.js",
    "src/app-server-client.js",
    "src/cli.js",
    "src/errors.js",
    "src/experimental-profile-client.js",
    "src/experimental-profile.js",
    "src/format-account-usage.js",
    "src/format-experimental-profile.js",
    "src/index.d.ts",
    "src/index.js"
  ]) {
    assert.equal(paths.has(required), true, `missing package file: ${required}`);
  }

  assert.equal([...paths].some((path) => path.includes("__tests__")), false);
  assert.equal([...paths].some((path) => path.includes("parser")), false);
  assert.equal([...paths].some((path) => path.includes("snapshot")), false);
  assert.equal([...paths].some((path) => path.startsWith("mydocs")), false);
});
