import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { posix as path } from "node:path";

export async function resolveCodexExecutable(options = {}) {
  const platform = options.platform ?? process.platform;
  if (platform !== "darwin") {
    return "codex";
  }

  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  const isExecutable = options.isExecutable ?? isExecutableFile;

  if (await hasExecutableOnPath(env.PATH, isExecutable)) {
    return "codex";
  }

  for (const candidate of macAppCandidates(homeDir)) {
    if (await safelyCheckExecutable(candidate, isExecutable)) {
      return candidate;
    }
  }

  return null;
}

async function hasExecutableOnPath(pathValue, isExecutable) {
  if (typeof pathValue !== "string" || pathValue.length === 0) {
    return false;
  }

  for (const directory of pathValue.split(":")) {
    const candidate = path.join(directory || ".", "codex");
    if (await safelyCheckExecutable(candidate, isExecutable)) {
      return true;
    }
  }

  return false;
}

function macAppCandidates(homeDir) {
  const executableParts = ["Contents", "Resources", "codex"];

  return [
    path.join("/Applications", "ChatGPT.app", ...executableParts),
    path.join("/Applications", "Codex.app", ...executableParts),
    path.join(homeDir, "Applications", "ChatGPT.app", ...executableParts),
    path.join(homeDir, "Applications", "Codex.app", ...executableParts)
  ];
}

async function safelyCheckExecutable(candidate, isExecutable) {
  try {
    return await isExecutable(candidate);
  } catch {
    return false;
  }
}

async function isExecutableFile(candidate) {
  const metadata = await stat(candidate);
  if (!metadata.isFile()) {
    return false;
  }

  await access(candidate, constants.X_OK);
  return true;
}
