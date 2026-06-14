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
            kind: "event",
            event: JSON.parse(line)
          };
        } catch {
          yield {
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

  return {
    durationMs: payload.duration_ms,
    effort: payload.effort,
    lastTokenUsage: isRecord(payload.last_token_usage) ? payload.last_token_usage : null,
    mode: payload.mode,
    model: payload.model,
    timestamp: event.timestamp,
    totalTokenUsage: isRecord(payload.total_token_usage) ? payload.total_token_usage : null
  };
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
