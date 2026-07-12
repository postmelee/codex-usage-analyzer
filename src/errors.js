export const CODEX_USAGE_ERROR_CODES = Object.freeze({
  INVALID_TIMEOUT: "INVALID_TIMEOUT",
  CODEX_NOT_FOUND: "CODEX_NOT_FOUND",
  APP_SERVER_START_FAILED: "APP_SERVER_START_FAILED",
  APP_SERVER_EXITED: "APP_SERVER_EXITED",
  APP_SERVER_TIMEOUT: "APP_SERVER_TIMEOUT",
  APP_SERVER_PROTOCOL_ERROR: "APP_SERVER_PROTOCOL_ERROR",
  APP_SERVER_RPC_ERROR: "APP_SERVER_RPC_ERROR",
  INVALID_ACCOUNT_USAGE_RESPONSE: "INVALID_ACCOUNT_USAGE_RESPONSE"
});

const ERROR_MESSAGES = Object.freeze({
  [CODEX_USAGE_ERROR_CODES.INVALID_TIMEOUT]:
    "timeoutMs must be an integer between 1 and 120000.",
  [CODEX_USAGE_ERROR_CODES.CODEX_NOT_FOUND]:
    "Codex CLI or compatible app was not found. Install or update Codex, then sign in with ChatGPT.",
  [CODEX_USAGE_ERROR_CODES.APP_SERVER_START_FAILED]:
    "Codex app-server could not be started.",
  [CODEX_USAGE_ERROR_CODES.APP_SERVER_EXITED]:
    "Codex app-server exited before returning account usage.",
  [CODEX_USAGE_ERROR_CODES.APP_SERVER_TIMEOUT]:
    "Codex app-server timed out before returning account usage.",
  [CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR]:
    "Codex app-server returned an invalid protocol message.",
  [CODEX_USAGE_ERROR_CODES.APP_SERVER_RPC_ERROR]:
    "Codex app-server could not read account usage. Check your Codex version and ChatGPT sign-in.",
  [CODEX_USAGE_ERROR_CODES.INVALID_ACCOUNT_USAGE_RESPONSE]:
    "Codex app-server returned an invalid account usage response."
});

export class CodexUsageError extends Error {
  constructor(code, options = {}) {
    const message = ERROR_MESSAGES[code];
    if (message === undefined) {
      throw new TypeError("Unknown Codex usage error code");
    }

    super(message);
    this.name = "CodexUsageError";
    this.code = code;

    if (Number.isInteger(options.rpcCode)) {
      this.rpcCode = options.rpcCode;
    }
  }
}
