import { readAccountUsage } from "./account-usage.js";
import { CodexUsageError } from "./errors.js";
import { formatAccountUsage } from "./format-account-usage.js";

export const PACKAGE_NAME = "codex-usage-analyzer";
export const PACKAGE_VERSION = "0.3.0";
export const EXPERIMENTAL_PROFILE_WARNING =
  "codex-usage-analyzer: Warning: profile uses an unsupported experimental endpoint and may expose account identity fields.";

const USAGE = [
  "codex-usage-analyzer - Read your Codex account usage",
  "",
  "Usage:",
  "  codex-usage-analyzer [usage] [--json]",
  "  codex-usage-analyzer profile [--json]  (experimental)",
  "  codex-usage-analyzer [usage|profile] --help",
  "  codex-usage-analyzer --version"
].join("\n");

export async function runCli(argv, io = {}, dependencies = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const parsed = parseArguments(argv);

  if (parsed.action === "help") {
    stdout.write(`${USAGE}\n`);
    return 0;
  }

  if (parsed.action === "version") {
    stdout.write(`${PACKAGE_VERSION}\n`);
    return 0;
  }

  if (parsed.action === "invalid") {
    stderr.write(`${USAGE}\n`);
    return 1;
  }

  try {
    if (parsed.action === "profile") {
      stderr.write(`${EXPERIMENTAL_PROFILE_WARNING}\n`);
      const readProfile = dependencies.readExperimentalProfile
        ?? (await import("./experimental-profile-client.js"))
          .readExperimentalProfile;
      const profile = await readProfile();
      let output;

      if (parsed.json) {
        output = JSON.stringify(profile, null, 2);
      } else {
        const formatProfile = dependencies.formatExperimentalProfile
          ?? (await import("./format-experimental-profile.js"))
            .formatExperimentalProfile;
        output = formatProfile(profile);
      }

      stdout.write(`${output}\n`);
      return profile.status === "unavailable" ? 1 : 0;
    }

    const readUsage = dependencies.readAccountUsage ?? readAccountUsage;
    const formatUsage = dependencies.formatAccountUsage ?? formatAccountUsage;
    const usage = await readUsage();
    stdout.write(`${parsed.json
      ? JSON.stringify(usage, null, 2)
      : formatUsage(usage)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof CodexUsageError) {
      stderr.write(`${PACKAGE_NAME}: ${error.message} [${error.code}]\n`);
    } else {
      stderr.write(`${PACKAGE_NAME}: Unexpected failure. [UNEXPECTED_ERROR]\n`);
    }

    return 1;
  }
}

function parseArguments(argv) {
  const args = [...argv];
  let action = "usage";

  if (args[0] === "usage" || args[0] === "profile") {
    action = args[0];
    args.shift();
  } else if (args[0] !== undefined && !args[0].startsWith("-")) {
    return { action: "invalid" };
  }

  if (args.length === 0) {
    return { action, json: false };
  }

  if (args.length !== 1) {
    return { action: "invalid" };
  }

  if (args[0] === "--json") {
    return { action, json: true };
  }

  if (args[0] === "--help" || args[0] === "-h") {
    return { action: "help" };
  }

  if (args[0] === "--version" || args[0] === "-v") {
    return { action: "version" };
  }

  return { action: "invalid" };
}
