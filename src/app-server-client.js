import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

import { resolveCodexExecutable } from "./codex-executable.js";
import { CODEX_USAGE_ERROR_CODES, CodexUsageError } from "./errors.js";

export const DEFAULT_APP_SERVER_TIMEOUT_MS = 15_000;
export const MAX_APP_SERVER_TIMEOUT_MS = 120_000;

const INITIALIZE_REQUEST_ID = 0;
const ACCOUNT_USAGE_REQUEST_ID = 1;

export async function requestAccountUsageFromAppServer(options = {}) {
  const timeoutMs = normalizeTimeoutMs(options.timeoutMs);
  const spawnProcess = options.spawnProcess ?? spawn;
  const resolveExecutable = options.resolveExecutable ?? resolveCodexExecutable;
  let command;
  let child;

  try {
    command = await resolveExecutable();
  } catch {
    return Promise.reject(new CodexUsageError(
      CODEX_USAGE_ERROR_CODES.APP_SERVER_START_FAILED
    ));
  }

  if (command === null) {
    return Promise.reject(new CodexUsageError(
      CODEX_USAGE_ERROR_CODES.CODEX_NOT_FOUND
    ));
  }

  try {
    child = spawnProcess(command, ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
  } catch (error) {
    return Promise.reject(createSpawnError(error));
  }

  if (!child?.stdin || !child?.stdout || !child?.stderr) {
    stopChild(child);
    return Promise.reject(new CodexUsageError(
      CODEX_USAGE_ERROR_CODES.APP_SERVER_START_FAILED
    ));
  }

  child.stderr.resume();

  return new Promise((resolve, reject) => {
    const lines = createInterface({
      input: child.stdout,
      crlfDelay: Infinity
    });
    let phase = "initializing";
    let settled = false;

    const timer = setTimeout(() => {
      fail(new CodexUsageError(CODEX_USAGE_ERROR_CODES.APP_SERVER_TIMEOUT));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      lines.removeAllListeners();
      lines.close();

      if (!child.stdin.destroyed) {
        child.stdin.end();
      }

      stopChild(child);
    }

    function succeed(result) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    }

    function fail(error) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    }

    function send(message) {
      if (settled) return;

      try {
        child.stdin.write(`${JSON.stringify(message)}\n`, (error) => {
          if (error) {
            fail(new CodexUsageError(
              CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
            ));
          }
        });
      } catch {
        fail(new CodexUsageError(
          CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
        ));
      }
    }

    function onError(error) {
      fail(createSpawnError(error));
    }

    function onExit() {
      fail(new CodexUsageError(CODEX_USAGE_ERROR_CODES.APP_SERVER_EXITED));
    }

    function onLine(line) {
      let message;

      try {
        message = JSON.parse(line);
      } catch {
        fail(new CodexUsageError(
          CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
        ));
        return;
      }

      if (!isRecord(message)) {
        fail(new CodexUsageError(
          CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
        ));
        return;
      }

      if (message.id === INITIALIZE_REQUEST_ID) {
        if (phase !== "initializing") {
          fail(new CodexUsageError(
            CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
          ));
          return;
        }

        if (hasRpcError(message)) {
          fail(createRpcError(message.error));
          return;
        }

        if (!Object.hasOwn(message, "result")) {
          fail(new CodexUsageError(
            CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
          ));
          return;
        }

        phase = "reading_usage";
        send({ method: "initialized", params: {} });
        send({ method: "account/usage/read", id: ACCOUNT_USAGE_REQUEST_ID });
        return;
      }

      if (message.id === ACCOUNT_USAGE_REQUEST_ID) {
        if (phase !== "reading_usage") {
          fail(new CodexUsageError(
            CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
          ));
          return;
        }

        if (hasRpcError(message)) {
          fail(createRpcError(message.error));
          return;
        }

        if (!Object.hasOwn(message, "result")) {
          fail(new CodexUsageError(
            CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
          ));
          return;
        }

        succeed(message.result);
      }
    }

    child.once("error", onError);
    child.once("exit", onExit);
    lines.on("line", onLine);

    send({
      method: "initialize",
      id: INITIALIZE_REQUEST_ID,
      params: {
        clientInfo: {
          name: "codex_usage_analyzer",
          title: "Codex Usage Analyzer",
          version: "0.4.0"
        }
      }
    });
  });
}

function normalizeTimeoutMs(value) {
  if (value === undefined) {
    return DEFAULT_APP_SERVER_TIMEOUT_MS;
  }

  if (!Number.isInteger(value) || value < 1 || value > MAX_APP_SERVER_TIMEOUT_MS) {
    throw new CodexUsageError(CODEX_USAGE_ERROR_CODES.INVALID_TIMEOUT);
  }

  return value;
}

function createSpawnError(error) {
  const code = error && typeof error === "object" ? error.code : undefined;
  return new CodexUsageError(
    code === "ENOENT"
      ? CODEX_USAGE_ERROR_CODES.CODEX_NOT_FOUND
      : CODEX_USAGE_ERROR_CODES.APP_SERVER_START_FAILED
  );
}

function createRpcError(error) {
  return new CodexUsageError(CODEX_USAGE_ERROR_CODES.APP_SERVER_RPC_ERROR, {
    rpcCode: Number.isInteger(error?.code) ? error.code : undefined
  });
}

function hasRpcError(message) {
  return Object.hasOwn(message, "error");
}

function stopChild(child) {
  if (!child || child.exitCode !== null || child.killed) return;

  try {
    child.kill();
  } catch {
    // Cleanup failure does not replace the safe protocol result.
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
