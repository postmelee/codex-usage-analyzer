import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

import { normalizeAccountUsageResult } from "./account-usage.js";
import { resolveCodexExecutable } from "./codex-executable.js";
import { CODEX_USAGE_ERROR_CODES, CodexUsageError } from "./errors.js";
import {
  createUnavailableFullProfile,
  createUnavailableFullProfileV2,
  normalizeFullProfileResult,
  normalizeFullProfileV2Result
} from "./experimental-profile.js";

export const EXPERIMENTAL_PROFILE_URL =
  "https://chatgpt.com/backend-api/wham/profiles/me";
export const DEFAULT_EXPERIMENTAL_PROFILE_TIMEOUT_MS = 15_000;
export const MAX_EXPERIMENTAL_PROFILE_RESPONSE_BYTES = 1_048_576;

const MAX_TIMEOUT_MS = 120_000;
const MAX_AUTH_TOKEN_LENGTH = 65_536;
const MAX_ACCOUNT_ID_LENGTH = 256;
const INITIALIZE_REQUEST_ID = 0;
const ACCOUNT_USAGE_REQUEST_ID = 1;
const ACCOUNT_READ_REQUEST_ID = 2;
const AUTH_STATUS_REQUEST_ID = 3;
const CLIENT_VERSION = "0.4.0";
const ACCOUNT_CLAIM = "https://api.openai.com/auth";
const AUTHORIZATION_SCHEME = "Bearer";

export async function readExperimentalProfile(options = {}) {
  const timeoutMs = normalizeTimeoutMs(options.timeoutMs);
  const session = await requestExperimentalSession({
    timeoutMs,
    spawnProcess: options.spawnProcess,
    resolveExecutable: options.resolveExecutable
  });
  const usage = normalizeAccountUsageResult(session.usageResult, {
    capturedAt: options.capturedAt
  });
  const pet = options.includePet === true
    ? await readRequestedPet(options)
    : null;
  const planType = extractPlanType(session.accountResult);
  let authToken = extractAuthToken(session.authResult);
  let accountId = authToken === null ? null : extractAccountId(authToken);

  session.accountResult = null;
  session.authResult = null;

  if (authToken === null || accountId === null) {
    authToken = null;
    accountId = null;
    return options.includePet === true
      ? createUnavailableFullProfileV2(usage, pet)
      : createUnavailableFullProfile(usage);
  }

  try {
    const remoteResult = await requestRemoteProfile({
      accountId,
      authToken,
      fetchImpl: options.fetchImpl,
      timeoutMs
    });

    if (remoteResult === null) {
      return options.includePet === true
        ? createUnavailableFullProfileV2(usage, pet)
        : createUnavailableFullProfile(usage);
    }

    return options.includePet === true
      ? normalizeFullProfileV2Result(usage, remoteResult, pet, { planType })
      : normalizeFullProfileResult(usage, remoteResult, { planType });
  } finally {
    authToken = null;
    accountId = null;
  }
}

async function readRequestedPet(options) {
  let petModule;

  async function loadPetModule() {
    petModule ??= await import("./experimental-pet.js");
    return petModule;
  }

  async function readPet(petOptions) {
    const reader = options.readExperimentalPet
      ?? (await loadPetModule()).readExperimentalPet;
    return reader(petOptions);
  }

  async function listPets(petOptions) {
    const reader = options.listExperimentalPets
      ?? (await loadPetModule()).listExperimentalPets;
    return reader(petOptions);
  }

  const petOptions = copyPetSourceOptions(options);

  try {
    if (options.forcePetSelection === true) {
      return await selectRequestedPet(options, petOptions, listPets, readPet);
    }

    if (Object.hasOwn(options, "petKey")) {
      return await readPet({ ...petOptions, petKey: options.petKey });
    }

    const selected = await readPet(petOptions);
    if (selected?.status === "ok" || typeof options.selectPet !== "function") {
      return selected;
    }

    return await selectRequestedPet(options, petOptions, listPets, readPet);
  } catch {
    return selectionUnavailablePet();
  }
}

async function selectRequestedPet(
  options,
  petOptions,
  listPets,
  readPet
) {
  if (typeof options.selectPet !== "function") {
    return selectionUnavailablePet();
  }

  try {
    const catalog = await listPets(petOptions);
    const petKey = await options.selectPet(catalog);
    if (!Number.isSafeInteger(petKey) || petKey < 1) {
      return selectionUnavailablePet();
    }
    return await readPet({ ...petOptions, petKey });
  } catch {
    return selectionUnavailablePet();
  }
}

function copyPetSourceOptions(options) {
  const copied = {};
  for (const key of ["codexHome", "env", "homeDir"]) {
    if (Object.hasOwn(options, key)) copied[key] = options[key];
  }
  return copied;
}

function selectionUnavailablePet() {
  return {
    status: "unavailable",
    reason: "selected_pet_selection_unavailable",
    kind: null,
    image: null
  };
}

async function requestExperimentalSession(options) {
  const spawnProcess = options.spawnProcess ?? spawn;
  const resolveExecutable = options.resolveExecutable ?? resolveCodexExecutable;
  let command;
  let child;

  try {
    command = await resolveExecutable();
  } catch {
    throw new CodexUsageError(
      CODEX_USAGE_ERROR_CODES.APP_SERVER_START_FAILED
    );
  }

  if (command === null) {
    throw new CodexUsageError(CODEX_USAGE_ERROR_CODES.CODEX_NOT_FOUND);
  }

  try {
    child = spawnProcess(command, ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
  } catch (error) {
    throw createSpawnError(error);
  }

  if (!child?.stdin || !child?.stdout || !child?.stderr) {
    stopChild(child);
    throw new CodexUsageError(
      CODEX_USAGE_ERROR_CODES.APP_SERVER_START_FAILED
    );
  }

  child.stderr.resume();

  return new Promise((resolve, reject) => {
    const lines = createInterface({
      input: child.stdout,
      crlfDelay: Infinity
    });
    const responses = {
      usageResult: undefined,
      accountResult: undefined,
      authResult: undefined
    };
    let phase = "initializing";
    let settled = false;

    const timer = setTimeout(() => {
      if (responses.usageResult !== undefined) {
        succeedWithOptionalFailures();
      } else {
        fail(new CodexUsageError(CODEX_USAGE_ERROR_CODES.APP_SERVER_TIMEOUT));
      }
    }, options.timeoutMs);

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

    function succeedWithOptionalFailures() {
      succeed({
        usageResult: responses.usageResult,
        accountResult: responses.accountResult ?? null,
        authResult: responses.authResult ?? null
      });
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
            failOrReturnUnavailable(
              new CodexUsageError(
                CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
              )
            );
          }
        });
      } catch {
        failOrReturnUnavailable(
          new CodexUsageError(
            CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
          )
        );
      }
    }

    function failOrReturnUnavailable(error) {
      if (responses.usageResult !== undefined) {
        succeedWithOptionalFailures();
      } else {
        fail(error);
      }
    }

    function onError(error) {
      failOrReturnUnavailable(createSpawnError(error));
    }

    function onExit() {
      failOrReturnUnavailable(
        new CodexUsageError(CODEX_USAGE_ERROR_CODES.APP_SERVER_EXITED)
      );
    }

    function onLine(line) {
      let message;

      try {
        message = JSON.parse(line);
      } catch {
        failOrReturnUnavailable(
          new CodexUsageError(
            CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
          )
        );
        return;
      }

      if (!isRecord(message)) {
        failOrReturnUnavailable(
          new CodexUsageError(
            CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
          )
        );
        return;
      }

      if (message.id === INITIALIZE_REQUEST_ID) {
        handleInitialize(message);
        return;
      }

      if (message.id === ACCOUNT_USAGE_REQUEST_ID) {
        handleRequiredUsage(message);
        return;
      }

      if (message.id === ACCOUNT_READ_REQUEST_ID) {
        handleOptionalResponse("accountResult", message);
        return;
      }

      if (message.id === AUTH_STATUS_REQUEST_ID) {
        handleOptionalResponse("authResult", message);
      }
    }

    function handleInitialize(message) {
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

      phase = "reading_profile_context";
      send({ method: "initialized", params: {} });
      send({ method: "account/usage/read", id: ACCOUNT_USAGE_REQUEST_ID });
      send({
        method: "account/read",
        id: ACCOUNT_READ_REQUEST_ID,
        params: { refreshToken: false }
      });
      send({
        method: "getAuthStatus",
        id: AUTH_STATUS_REQUEST_ID,
        params: { includeToken: true, refreshToken: false }
      });
    }

    function handleRequiredUsage(message) {
      if (phase !== "reading_profile_context"
        || responses.usageResult !== undefined) {
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

      responses.usageResult = message.result;
      finishIfComplete();
    }

    function handleOptionalResponse(key, message) {
      if (phase !== "reading_profile_context" || responses[key] !== undefined) {
        failOrReturnUnavailable(
          new CodexUsageError(
            CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
          )
        );
        return;
      }

      responses[key] = hasRpcError(message)
        || !Object.hasOwn(message, "result")
        ? null
        : message.result;
      finishIfComplete();
    }

    function finishIfComplete() {
      if (responses.usageResult !== undefined
        && responses.accountResult !== undefined
        && responses.authResult !== undefined) {
        succeedWithOptionalFailures();
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
          version: CLIENT_VERSION
        }
      }
    });
  });
}

async function requestRemoteProfile(options) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetchImpl(EXPERIMENTAL_PROFILE_URL, {
      method: "GET",
      credentials: "omit",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `${AUTHORIZATION_SCHEME} ${options.authToken}`,
        "ChatGPT-Account-Id": options.accountId,
        originator: "codex-usage-analyzer",
        "User-Agent": `codex-usage-analyzer/${CLIENT_VERSION}`
      }
    });

    if (!isRecord(response)
      || !Number.isInteger(response.status)
      || response.status < 200
      || response.status >= 300
      || !hasJsonContentType(response.headers)) {
      return null;
    }

    const body = await readLimitedResponseBody(response);
    if (body === null) return null;

    const parsed = JSON.parse(body);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

async function readLimitedResponseBody(response) {
  const contentLength = response.headers?.get?.("content-length");
  if (contentLength !== null && contentLength !== undefined) {
    if (!/^\d+$/u.test(contentLength)) return null;
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength)
      || declaredLength > MAX_EXPERIMENTAL_PROFILE_RESPONSE_BYTES) {
      return null;
    }
  }

  const reader = response.body?.getReader?.();
  if (reader === undefined) return null;

  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) return null;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_EXPERIMENTAL_PROFILE_RESPONSE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function hasJsonContentType(headers) {
  const value = headers?.get?.("content-type");
  return typeof value === "string"
    && /^application\/json(?:\s*;|$)/iu.test(value.trim());
}

function extractAuthToken(value) {
  if (!isRecord(value)
    || (value.authMethod !== "chatgpt"
      && value.authMethod !== "chatgptAuthTokens")
    || typeof value.authToken !== "string"
    || value.authToken.length < 1
    || value.authToken.length > MAX_AUTH_TOKEN_LENGTH
    || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(
      value.authToken
    )) {
    return null;
  }

  return value.authToken;
}

function extractAccountId(token) {
  const segments = token.split(".");
  if (segments.length !== 3 || segments[1].length === 0) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(segments[1], "base64url").toString("utf8")
    );
    const accountId = payload?.[ACCOUNT_CLAIM]?.chatgpt_account_id;

    if (typeof accountId !== "string"
      || accountId.length < 1
      || accountId.length > MAX_ACCOUNT_ID_LENGTH
      || accountId.trim() !== accountId
      || hasControlCharacter(accountId)) {
      return null;
    }

    return accountId;
  } catch {
    return null;
  }
}

function extractPlanType(value) {
  const account = isRecord(value) ? value.account : null;
  if (!isRecord(account)
    || account.type !== "chatgpt"
    || typeof account.planType !== "string"
    || account.planType.length < 1
    || account.planType.length > 64
    || hasControlCharacter(account.planType)) {
    return null;
  }

  return account.planType;
}

function normalizeTimeoutMs(value) {
  if (value === undefined) {
    return DEFAULT_EXPERIMENTAL_PROFILE_TIMEOUT_MS;
  }

  if (!Number.isInteger(value) || value < 1 || value > MAX_TIMEOUT_MS) {
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

function hasControlCharacter(value) {
  return /[\u0000-\u001f\u007f]/u.test(value);
}

function stopChild(child) {
  if (!child || child.exitCode !== null || child.killed) return;

  try {
    child.kill();
  } catch {
    // Cleanup failure must not expose or replace profile state.
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
