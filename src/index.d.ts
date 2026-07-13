export declare const PACKAGE_NAME: "codex-usage-analyzer";
export declare const PACKAGE_VERSION: "0.3.0";
export declare const ACCOUNT_USAGE_CONTRACT_VERSION: 1;
export declare const ACCOUNT_USAGE_SUMMARY_FIELDS: readonly [
  "lifetimeTokens",
  "peakDailyTokens",
  "longestRunningTurnSec",
  "currentStreakDays",
  "longestStreakDays"
];

export interface AccountUsageSummary {
  lifetimeTokens: number | null;
  peakDailyTokens: number | null;
  longestRunningTurnSec: number | null;
  currentStreakDays: number | null;
  longestStreakDays: number | null;
}

export interface AccountUsageDailyBucket {
  startDate: string;
  tokens: number;
}

export interface AccountUsageDocument {
  contractVersion: 1;
  capturedAt: string;
  summary: AccountUsageSummary;
  dailyUsageBuckets: AccountUsageDailyBucket[] | null;
}

export interface ReadAccountUsageOptions {
  timeoutMs?: number;
}

export type CodexUsageErrorCode =
  | "INVALID_TIMEOUT"
  | "CODEX_NOT_FOUND"
  | "APP_SERVER_START_FAILED"
  | "APP_SERVER_EXITED"
  | "APP_SERVER_TIMEOUT"
  | "APP_SERVER_PROTOCOL_ERROR"
  | "APP_SERVER_RPC_ERROR"
  | "INVALID_ACCOUNT_USAGE_RESPONSE";

export declare const CODEX_USAGE_ERROR_CODES: Readonly<{
  INVALID_TIMEOUT: "INVALID_TIMEOUT";
  CODEX_NOT_FOUND: "CODEX_NOT_FOUND";
  APP_SERVER_START_FAILED: "APP_SERVER_START_FAILED";
  APP_SERVER_EXITED: "APP_SERVER_EXITED";
  APP_SERVER_TIMEOUT: "APP_SERVER_TIMEOUT";
  APP_SERVER_PROTOCOL_ERROR: "APP_SERVER_PROTOCOL_ERROR";
  APP_SERVER_RPC_ERROR: "APP_SERVER_RPC_ERROR";
  INVALID_ACCOUNT_USAGE_RESPONSE: "INVALID_ACCOUNT_USAGE_RESPONSE";
}>;

export declare class CodexUsageError extends Error {
  readonly code: CodexUsageErrorCode;
  readonly rpcCode?: number;
  constructor(code: CodexUsageErrorCode, options?: { rpcCode?: number });
}

export interface CliIo {
  stdout?: {
    write(chunk: string): unknown;
  };
  stderr?: {
    write(chunk: string): unknown;
  };
}

export declare function readAccountUsage(
  options?: ReadAccountUsageOptions
): Promise<AccountUsageDocument>;

export declare function runCli(argv: string[], io?: CliIo): Promise<number>;
