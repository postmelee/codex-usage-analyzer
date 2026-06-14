import { createReadStream } from "node:fs";
import { access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

export async function discoverSessionJsonlFiles(codexHome) {
  const sessionsDir = join(codexHome, "sessions");
  const diagnostics = [];

  try {
    await access(sessionsDir, constants.R_OK);
  } catch {
    return {
      files: [],
      diagnostics: [{
        code: "sessions_unavailable",
        severity: "info"
      }]
    };
  }

  const files = [];
  await collectJsonlFiles(sessionsDir, files, diagnostics);

  return {
    files: files.sort(),
    diagnostics
  };
}

export async function* readSessionJsonlEntries(files) {
  for (const file of files) {
    let lineNumber = 0;

    let lines;
    try {
      lines = createInterface({
        crlfDelay: Infinity,
        input: createReadStream(file, { encoding: "utf8" })
      });
    } catch {
      yield { kind: "file_error" };
      continue;
    }

    try {
      for await (const line of lines) {
        lineNumber += 1;

        if (line.trim().length === 0) {
          continue;
        }

        try {
          yield {
            file,
            kind: "event",
            event: JSON.parse(line)
          };
        } catch {
          yield {
            file,
            kind: "malformed_line",
            lineNumber
          };
        }
      }
    } catch {
      yield { kind: "file_error" };
    }
  }
}

export function normalizeSessionTokenCountEvent(event) {
  if (!isRecord(event) || event.type !== "event_msg") {
    return null;
  }

  const payload = event.payload;
  if (!isRecord(payload) || payload.type !== "token_count") {
    return null;
  }

  const info = isRecord(payload.info) ? payload.info : null;

  return {
    durationMs: payload.duration_ms,
    effort: payload.effort,
    lastTokenUsage: readRecordAlias(payload, info, "last_token_usage"),
    mode: payload.mode,
    model: extractSessionModel(event),
    timestamp: event.timestamp,
    totalTokenUsage: readRecordAlias(payload, info, "total_token_usage")
  };
}

export function extractSessionModel(event) {
  if (!isRecord(event)) {
    return null;
  }

  const payload = isRecord(event.payload) ? event.payload : null;
  if (payload === null) {
    return null;
  }

  const info = isRecord(payload.info) ? payload.info : null;
  const modelInfo = isRecord(payload.model_info) ? payload.model_info : null;

  return readStringAlias(
    modelInfo?.slug,
    payload.model,
    payload.model_name,
    info?.model,
    info?.model_name
  );
}

async function collectJsonlFiles(directory, files, diagnostics) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    diagnostics.push({
      code: "session_directory_unreadable",
      severity: "warning"
    });
    return;
  }

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await collectJsonlFiles(entryPath, files, diagnostics);
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      files.push(entryPath);
    }
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readRecordAlias(primary, secondary, key) {
  if (isRecord(primary[key])) {
    return primary[key];
  }

  if (isRecord(secondary?.[key])) {
    return secondary[key];
  }

  return null;
}

function readStringAlias(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}
