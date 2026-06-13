import type { UsageSnapshotV2 } from "./snapshot/v2-types.js";

export * from "./snapshot/v2-types.js";

export declare const ANALYZER_NAME: "codex-usage-analyzer";
export declare const ANALYZER_VERSION: string;

export interface AnalyzeUsageOptions {
  /**
   * Capture timestamp for the production snapshot. Defaults to the analyzer run time.
   */
  capturedAt?: string | Date | null;
}

export interface CliIo {
  stdout?: {
    write(chunk: string): unknown;
  };
  stderr?: {
    write(chunk: string): unknown;
  };
}

/**
 * Analyze usage into a production UsageSnapshot v2.
 *
 * Until the local parser stages land, unavailable fields are represented with
 * zero/null/empty values plus a namespaced diagnostic extension. This function
 * does not return the sample fixture.
 */
export declare function analyzeUsage(options?: AnalyzeUsageOptions): Promise<UsageSnapshotV2>;

export declare function createSampleUsageSnapshotV2(
  overrides?: Record<string, unknown>
): UsageSnapshotV2;

export declare function runCli(argv: string[], io?: CliIo): Promise<number>;
