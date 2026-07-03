#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageName = "codex-usage-analyzer";
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));

if (args.help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}

if (!args.ok) {
  process.stderr.write(`${usage()}\n`);
  process.exit(1);
}

const checks = [];
const context = {
  packageJson: null,
  packageVersion: null,
  registryVersion: null,
  distTags: {},
  pack: null
};

await runCheck("package metadata", () => checkPackageMetadata(context));
await runCheck("registry version", () => checkRegistryVersion(context, args.releaseReady));
await runCheck("working tree state", () => checkWorkingTree(args.releaseReady));
await runCheck("release tag state", () => checkReleaseTag(context, args.releaseReady));
await runCheck("test suite", () => runNpmTest());
await runCheck("package dry run", () => checkPackDryRun(context));
await runCheck("publish workflow", () => checkPublishWorkflow());
await runCheck("release checklist", () => checkReleaseChecklist());
await runCheck("sensitive pattern scan", () => checkSensitivePatterns());

printSummary();

if (checks.some((check) => check.status === "FAIL")) {
  process.exitCode = 1;
} else {
  process.exitCode = 0;
}

function parseArgs(rawArgs) {
  const parsed = {
    help: false,
    ok: true,
    releaseReady: false
  };

  for (const arg of rawArgs) {
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      return parsed;
    }

    if (arg === "--release-ready") {
      parsed.releaseReady = true;
      continue;
    }

    parsed.ok = false;
    return parsed;
  }

  return parsed;
}

function usage() {
  return [
    "Usage:",
    "  npm run release:preflight",
    "  npm run release:preflight -- --release-ready",
    "",
    "Runs read-only release checks. Default mode reports release-readiness gaps",
    "as warnings; --release-ready treats those gaps as failures."
  ].join("\n");
}

async function runCheck(name, run) {
  try {
    const result = await run();
    if (result && result.status) {
      addCheck(result.status, name, result.detail);
      return;
    }

    addCheck("OK", name, result?.detail ?? "passed");
  } catch (error) {
    addCheck("FAIL", name, getSafeErrorMessage(error));
  }
}

function addCheck(status, name, detail) {
  checks.push({ status, name, detail });
}

function checkPackageMetadata(context) {
  const packageJson = readJsonFile("package.json");

  if (packageJson.name !== packageName) {
    throw new Error("package_name_mismatch");
  }

  if (typeof packageJson.version !== "string" || !isSemverLike(packageJson.version)) {
    throw new Error("invalid_package_version");
  }

  if (packageJson.license !== "MIT") {
    throw new Error("license_metadata_mismatch");
  }

  if (!packageJson.scripts || packageJson.scripts.test !== "node --test") {
    throw new Error("test_script_missing");
  }

  context.packageJson = packageJson;
  context.packageVersion = packageJson.version;

  return { detail: `${packageName}@${packageJson.version}` };
}

function checkRegistryVersion(context, releaseReady) {
  const registry = readJsonCommand("npm", [
    "view",
    packageName,
    "version",
    "dist-tags",
    "--json"
  ]);

  if (typeof registry.version !== "string" || !isSemverLike(registry.version)) {
    throw new Error("registry_version_unavailable");
  }

  context.registryVersion = registry.version;
  context.distTags = registry["dist-tags"] ?? {};

  const comparison = compareSemver(context.packageVersion, registry.version);

  if (comparison <= 0) {
    return {
      status: releaseReady ? "FAIL" : "WARN",
      detail: `local ${context.packageVersion} is not greater than registry ${registry.version}`
    };
  }

  return { detail: `local ${context.packageVersion} is greater than registry ${registry.version}` };
}

function checkWorkingTree(releaseReady) {
  const status = runTextCommand("git", ["status", "--short"]).trim();

  if (status.length > 0) {
    return {
      status: releaseReady ? "FAIL" : "WARN",
      detail: "working tree has uncommitted changes"
    };
  }

  return { detail: "working tree clean" };
}

function checkReleaseTag(context, releaseReady) {
  const expectedTag = `v${context.packageVersion}`;
  const tag = runTextCommand("git", ["tag", "--list", expectedTag]).trim();

  if (tag !== expectedTag) {
    return {
      status: releaseReady ? "FAIL" : "WARN",
      detail: `${expectedTag} tag is not present`
    };
  }

  return { detail: `${expectedTag} tag is present` };
}

function runNpmTest() {
  const result = spawnSync("npm", ["test"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    throw new Error(`npm_test_failed_exit_${result.status ?? "unknown"}`);
  }

  const passLine = result.stdout
    .split(/\r?\n/u)
    .find((line) => line.includes("pass "));

  return { detail: passLine ? passLine.trim() : "test command passed" };
}

function checkPackDryRun(context) {
  const pack = readJsonCommand("npm", ["pack", "--dry-run", "--json"]);
  const packageInfo = Array.isArray(pack) ? pack[0] : null;

  if (!packageInfo || !Array.isArray(packageInfo.files)) {
    throw new Error("pack_json_unusable");
  }

  context.pack = packageInfo;

  const paths = new Set(packageInfo.files.map((file) => file.path));
  const requiredPaths = [
    "LICENSE",
    "README.md",
    "package.json",
    "bin/codex-usage-analyzer.js",
    "src/analyze.js",
    "src/cli.js",
    "src/index.js",
    "src/index.d.ts",
    "src/snapshot/v2-schema.js"
  ];

  for (const path of requiredPaths) {
    if (!paths.has(path)) {
      throw new Error(`pack_missing_${path.replaceAll("/", "_")}`);
    }
  }

  const forbiddenPrefixes = ["mydocs/", ".github/", "scripts/", "src/__tests__/"];
  const forbiddenPath = packageInfo.files.find((file) =>
    forbiddenPrefixes.some((prefix) => file.path.startsWith(prefix))
  );

  if (forbiddenPath) {
    throw new Error(`pack_forbidden_${forbiddenPath.path.replaceAll("/", "_")}`);
  }

  if (packageInfo.filename && existsSync(join(repoRoot, packageInfo.filename))) {
    throw new Error("pack_dry_run_left_tarball");
  }

  return {
    detail: `${packageInfo.entryCount ?? packageInfo.files.length} files, ${formatBytes(packageInfo.size)} package`
  };
}

function checkPublishWorkflow() {
  const workflow = readTextFile(".github/workflows/publish.yml");
  const requiredText = [
    "workflow_dispatch:",
    "contents: read",
    "id-token: write",
    "node-version: 24",
    ["run: npm", "publish"].join(" ")
  ];

  for (const text of requiredText) {
    if (!workflow.includes(text)) {
      throw new Error(`workflow_missing_${sanitizeId(text)}`);
    }
  }

  const forbiddenText = ["NPM_TOKEN", "NODE_AUTH_TOKEN", "_authToken", "--provenance"];
  const forbidden = forbiddenText.find((text) => workflow.includes(text));

  if (forbidden) {
    throw new Error(`workflow_forbidden_${sanitizeId(forbidden)}`);
  }

  return { detail: "trusted publishing workflow checks passed" };
}

function checkReleaseChecklist() {
  const readme = readTextFile("README.md");
  const requiredText = [
    "Release Checklist",
    ["npm", "version", "--no-git-tag-version"].join(" "),
    "Publish Package",
    "npm audit signatures",
    "Do not paste raw production snapshot output"
  ];

  for (const text of requiredText) {
    if (!readme.includes(text)) {
      throw new Error(`readme_missing_${sanitizeId(text)}`);
    }
  }

  return { detail: "README release checklist checks passed" };
}

function checkSensitivePatterns() {
  const targetFiles = [
    "README.md",
    "package.json",
    ".github/workflows/publish.yml",
    "scripts/release-preflight.js"
  ];
  const patterns = [
    { id: "local_user_path", regex: /\/Users\/[A-Za-z0-9._-]+/u },
    { id: "private_key", regex: /BEGIN [A-Z ]*PRIVATE KEY/u },
    { id: "secret_like_token", regex: /sk-[A-Za-z0-9]{8,}/u },
    { id: "npm_auth_assignment", regex: /_authToken\s*=/u },
    { id: "npm_token_assignment", regex: /NPM_TOKEN\s*=/u },
    { id: "node_auth_token_assignment", regex: /NODE_AUTH_TOKEN\s*=/u }
  ];

  for (const targetFile of targetFiles) {
    if (!existsSync(join(repoRoot, targetFile))) {
      continue;
    }

    const content = readTextFile(targetFile);
    const matched = patterns.find((pattern) => pattern.regex.test(content));

    if (matched) {
      throw new Error(`sensitive_pattern_${matched.id}_${targetFile.replaceAll("/", "_")}`);
    }
  }

  return { detail: `${targetFiles.length} files scanned` };
}

function readJsonFile(relativePath) {
  return JSON.parse(readTextFile(relativePath));
}

function readTextFile(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readJsonCommand(command, args) {
  const stdout = runTextCommand(command, args);
  return JSON.parse(stdout);
}

function runTextCommand(command, args) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function isSemverLike(value) {
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(value);
}

function compareSemver(left, right) {
  const leftParts = parseSemver(left);
  const rightParts = parseSemver(right);

  for (let index = 0; index < 3; index += 1) {
    if (leftParts.core[index] > rightParts.core[index]) return 1;
    if (leftParts.core[index] < rightParts.core[index]) return -1;
  }

  if (leftParts.pre === rightParts.pre) return 0;
  if (!leftParts.pre) return 1;
  if (!rightParts.pre) return -1;
  return leftParts.pre > rightParts.pre ? 1 : -1;
}

function parseSemver(value) {
  const [versionAndPre] = value.split("+");
  const [core, pre = ""] = versionAndPre.split("-");

  return {
    core: core.split(".").map((part) => Number.parseInt(part, 10)),
    pre
  };
}

function formatBytes(value) {
  if (!Number.isFinite(value)) {
    return "unknown size";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  return `${(value / 1024).toFixed(1)} kB`;
}

function sanitizeId(value) {
  return value.replace(/[^A-Za-z0-9]+/gu, "_").replace(/^_|_$/gu, "").toLowerCase();
}

function getSafeErrorMessage(error) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message).split(/\r?\n/u)[0];
  }

  return "unexpected_error";
}

function printSummary() {
  process.stdout.write(`release preflight mode: ${args.releaseReady ? "release-ready" : "advisory"}\n`);

  for (const check of checks) {
    process.stdout.write(`[${check.status}] ${check.name}: ${check.detail}\n`);
  }

  if (checks.some((check) => check.status === "FAIL")) {
    process.stdout.write("release preflight failed\n");
    return;
  }

  if (checks.some((check) => check.status === "WARN")) {
    process.stdout.write("release preflight completed with warnings\n");
    return;
  }

  process.stdout.write("release preflight passed\n");
}
