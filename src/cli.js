import { readAccountUsage } from "./account-usage.js";
import { CodexUsageError } from "./errors.js";
import { formatAccountUsage } from "./format-account-usage.js";

export const PACKAGE_NAME = "codex-usage-analyzer";
export const PACKAGE_VERSION = "0.4.0";
export const EXPERIMENTAL_PROFILE_WARNING =
  "codex-usage-analyzer: Warning: profile uses an unsupported experimental endpoint and may expose account identity fields.";
export const EXPERIMENTAL_PET_WARNING =
  "codex-usage-analyzer: Warning: --include-pet reads local custom pet metadata and image bytes.";

const USAGE = [
  "codex-usage-analyzer - Read your Codex account usage",
  "",
  "Usage:",
  "  codex-usage-analyzer [usage] [--json]",
  "  codex-usage-analyzer profile [--json] [--include-pet]  (experimental)",
  "  codex-usage-analyzer profile --include-pet [--pet-key N | --select-pet]",
  "  codex-usage-analyzer [usage|profile] --help",
  "  codex-usage-analyzer --version"
].join("\n");

export async function runCli(argv, io = {}, dependencies = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const stdin = io.stdin ?? process.stdin;
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

  if (parsed.action === "profile"
    && parsed.selectPet
    && (stdin?.isTTY !== true || stderr?.isTTY !== true)) {
    stderr.write(`${USAGE}\n`);
    return 1;
  }

  try {
    if (parsed.action === "profile") {
      stderr.write(`${EXPERIMENTAL_PROFILE_WARNING}\n`);
      if (parsed.includePet) stderr.write(`${EXPERIMENTAL_PET_WARNING}\n`);
      const readProfile = dependencies.readExperimentalProfile
        ?? (await import("./experimental-profile-client.js"))
          .readExperimentalProfile;
      let profile;

      if (parsed.includePet) {
        const readOptions = { includePet: true };
        if (parsed.petKey !== null) readOptions.petKey = parsed.petKey;

        const useSelector = parsed.petKey === null && (
          parsed.selectPet
          || (!parsed.json && stdin?.isTTY === true && stderr?.isTTY === true)
        );
        if (useSelector) {
          const selectPet = dependencies.selectExperimentalPet
            ?? (await import("./experimental-pet-selector.js"))
              .selectExperimentalPet;
          readOptions.selectPet = (catalog) => selectPet(catalog, {
            input: stdin,
            output: stderr
          });
        }
        if (parsed.selectPet) readOptions.forcePetSelection = true;

        profile = await readProfile(readOptions);
      } else {
        profile = await readProfile();
      }
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

  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    return { action: "help" };
  }

  if (args.length === 1 && (args[0] === "--version" || args[0] === "-v")) {
    return { action: "version" };
  }

  if (action === "usage") {
    if (args.length === 0) return { action, json: false };
    if (args.length === 1 && args[0] === "--json") {
      return { action, json: true };
    }
    return { action: "invalid" };
  }

  let json = false;
  let includePet = false;
  let selectPet = false;
  let petKey = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--json") {
      if (json) return { action: "invalid" };
      json = true;
      continue;
    }

    if (argument === "--include-pet") {
      if (includePet) return { action: "invalid" };
      includePet = true;
      continue;
    }

    if (argument === "--select-pet") {
      if (selectPet) return { action: "invalid" };
      selectPet = true;
      continue;
    }

    if (argument === "--pet-key") {
      if (petKey !== null || index + 1 >= args.length) {
        return { action: "invalid" };
      }
      const value = args[index + 1];
      if (!/^[1-9][0-9]*$/u.test(value)) return { action: "invalid" };
      petKey = Number(value);
      if (!Number.isSafeInteger(petKey)) return { action: "invalid" };
      index += 1;
      continue;
    }

    return { action: "invalid" };
  }

  if ((petKey !== null || selectPet) && !includePet) {
    return { action: "invalid" };
  }
  if (petKey !== null && selectPet) return { action: "invalid" };

  return { action, json, includePet, petKey, selectPet };
}
