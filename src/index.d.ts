export declare const PACKAGE_NAME: "codex-usage-analyzer";
export declare const PACKAGE_VERSION: "0.4.1";
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

export type ExperimentalFullProfileStatus =
  | "ok"
  | "partial"
  | "unavailable";

export interface ExperimentalFullProfileProfile {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  planType: string | null;
}

export interface ExperimentalFullProfileInvocation {
  type: "plugin" | "skill";
  name: string;
  usageCount: number;
}

export interface ExperimentalFullProfileActivityInsights {
  fastModePercent: number | null;
  reasoningEffort: string | null;
  reasoningEffortPercent: number | null;
  skillsExplored: number | null;
  totalSkillsUsed: number | null;
  totalThreads: number | null;
  topInvocations: ExperimentalFullProfileInvocation[] | null;
}

export interface ExperimentalFullProfileV1 {
  fullProfileContractVersion: 1;
  kind: "codex-usage-analyzer.fullProfile";
  stability: "experimental";
  status: ExperimentalFullProfileStatus;
  usage: AccountUsageDocument;
  profile: ExperimentalFullProfileProfile | null;
  activityInsights: ExperimentalFullProfileActivityInsights | null;
}

export type ExperimentalPetReason =
  | "selected_pet_state_unavailable"
  | "selected_pet_not_custom"
  | "selected_pet_selection_unavailable"
  | "selected_pet_manifest_unavailable"
  | "selected_pet_image_unavailable"
  | "selected_pet_image_invalid"
  | "selected_pet_image_too_large";

export interface ExperimentalPetImage {
  role: "spritesheet";
  contentType: "image/webp" | "image/png";
  width: number;
  height: number;
  byteLength: number;
  sha256: string;
  base64: string;
}

export interface ExperimentalPetAvailable {
  status: "ok";
  reason: null;
  kind: "custom";
  image: ExperimentalPetImage;
}

export interface ExperimentalPetUnavailable {
  status: "unavailable";
  reason: ExperimentalPetReason;
  kind: null;
  image: null;
}

export type ExperimentalPet =
  | ExperimentalPetAvailable
  | ExperimentalPetUnavailable;

export interface ExperimentalPetCatalogItem {
  key: number;
  displayName: string | null;
  selected: boolean;
}

export interface ExperimentalFullProfileV2 {
  fullProfileContractVersion: 2;
  kind: "codex-usage-analyzer.fullProfile";
  stability: "experimental";
  status: ExperimentalFullProfileStatus;
  usage: AccountUsageDocument;
  profile: ExperimentalFullProfileProfile | null;
  activityInsights: ExperimentalFullProfileActivityInsights | null;
  pet: ExperimentalPet;
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
  stdin?: {
    isTTY?: boolean;
  };
  stdout?: {
    isTTY?: boolean;
    write(chunk: string): unknown;
  };
  stderr?: {
    isTTY?: boolean;
    write(chunk: string): unknown;
  };
}

export declare function readAccountUsage(
  options?: ReadAccountUsageOptions
): Promise<AccountUsageDocument>;

export declare function runCli(argv: string[], io?: CliIo): Promise<number>;
