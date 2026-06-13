import { homedir } from "node:os";
import { join } from "node:path";

export function resolveCodexHome(options = {}, env = process.env) {
  const explicitHome = normalizeCodexHome(options.codexHome);
  if (explicitHome !== null) {
    return {
      codexHome: explicitHome,
      source: "option"
    };
  }

  const envHome = normalizeCodexHome(env.CODEX_HOME);
  if (envHome !== null) {
    return {
      codexHome: envHome,
      source: "env"
    };
  }

  return {
    codexHome: join(homedir(), ".codex"),
    source: "default"
  };
}

function normalizeCodexHome(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError("codexHome must be a non-empty string");
  }

  return value;
}
