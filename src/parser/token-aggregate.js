import { resolveCodexHome } from "./codex-home.js";
import {
  discoverSessionJsonlFiles,
  readSessionJsonlEntries
} from "./session-jsonl.js";

const TOKEN_FIELDS = [
  ["inputTokens", "input_tokens"],
  ["outputTokens", "output_tokens"],
  ["cacheReadTokens", "cached_input_tokens", "cache_read_input_tokens"],
  ["cacheWriteTokens", "cache_write_input_tokens", "cache_write_tokens"],
  ["reasoningTokens", "reasoning_output_tokens"]
];

export async function aggregateTokenUsageFromCodexHome(options = {}) {
  const { codexHome, source } = resolveCodexHome(options);
  const discovery = await discoverSessionJsonlFiles(codexHome);
  const aggregate = await aggregateTokenUsageFromSessionFiles(discovery.files);

  aggregate.diagnostics.source = source;
  aggregate.diagnostics.discovery = summarizeDiscovery(discovery.diagnostics);

  if (discovery.files.length === 0) {
    aggregate.diagnostics.status = "unavailable";
    aggregate.diagnostics.reason = "session_jsonl_not_found";
  }

  return aggregate;
}

export async function aggregateTokenUsageFromSessionFiles(files) {
  const state = createAggregateState();

  for await (const entry of readSessionJsonlEntries(files)) {
    state.diagnostics.entriesScanned += 1;

    if (entry.kind === "malformed_line") {
      state.diagnostics.malformedLines += 1;
      continue;
    }

    if (entry.kind === "file_error") {
      state.diagnostics.fileErrors += 1;
      continue;
    }

    const tokenEvent = normalizeTokenEvent(entry.event);
    if (tokenEvent === null) {
      state.diagnostics.ignoredEvents += 1;
      continue;
    }

    state.diagnostics.tokenEvents += 1;

    if (tokenEvent.lastTokenUsage === null) {
      state.diagnostics.tokenEventsWithoutLastUsage += 1;
      continue;
    }

    applyTokenEvent(state, tokenEvent);
  }

  return finalizeAggregate(files.length, state);
}

function createAggregateState() {
  return {
    breakdown: createNullableSumState(),
    daily: new Map(),
    diagnostics: {
      status: "unavailable",
      reason: "no_token_events",
      source: "session_jsonl",
      filesScanned: 0,
      entriesScanned: 0,
      ignoredEvents: 0,
      tokenEvents: 0,
      tokenEventsWithUsage: 0,
      tokenEventsWithoutLastUsage: 0,
      malformedLines: 0,
      fileErrors: 0,
      discovery: []
    },
    totalTokens: 0
  };
}

function applyTokenEvent(state, tokenEvent) {
  const totalTokens = getTokenTotal(tokenEvent.lastTokenUsage);
  if (totalTokens === null) {
    state.diagnostics.tokenEventsWithoutLastUsage += 1;
    return;
  }

  state.totalTokens += totalTokens;
  state.diagnostics.tokenEventsWithUsage += 1;
  addBreakdown(state.breakdown, tokenEvent.lastTokenUsage);

  const date = getUtcDate(tokenEvent.timestamp);
  if (date !== null) {
    const daily = getDailyBucket(state.daily, date);
    daily.totalTokens += totalTokens;
    addBreakdown(daily.breakdown, tokenEvent.lastTokenUsage);
  }
}

function finalizeAggregate(filesScanned, state) {
  const daily = Array.from(state.daily.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, bucket]) => ({
      date,
      totalTokens: bucket.totalTokens,
      ...finalizeBreakdown(bucket.breakdown)
    }));

  const peakDailyTokens = daily.length > 0
    ? Math.max(...daily.map((bucket) => bucket.totalTokens))
    : null;

  const hasUsage = state.diagnostics.tokenEventsWithUsage > 0;
  state.diagnostics.filesScanned = filesScanned;
  state.diagnostics.status = hasUsage ? "ok" : state.diagnostics.status;
  state.diagnostics.reason = hasUsage ? null : state.diagnostics.reason;

  return {
    diagnostics: state.diagnostics,
    usage: {
      totalTokens: state.totalTokens,
      peakDailyTokens,
      tokenBreakdown: finalizeBreakdown(state.breakdown),
      daily
    }
  };
}

function normalizeTokenEvent(event) {
  if (!isRecord(event) || event.type !== "event_msg") {
    return null;
  }

  const payload = event.payload;
  if (!isRecord(payload) || payload.type !== "token_count") {
    return null;
  }

  return {
    lastTokenUsage: isRecord(payload.last_token_usage) ? payload.last_token_usage : null,
    timestamp: event.timestamp
  };
}

function getTokenTotal(usage) {
  const explicitTotal = readNonNegativeInteger(usage.total_tokens);
  if (explicitTotal !== null) {
    return explicitTotal;
  }

  let total = 0;
  let hasAnyField = false;
  for (const [, ...sourceKeys] of TOKEN_FIELDS) {
    const value = readFirstNonNegativeInteger(usage, sourceKeys);
    if (value !== null) {
      total += value;
      hasAnyField = true;
    }
  }

  return hasAnyField ? total : null;
}

function addBreakdown(target, usage) {
  for (const [targetKey, ...sourceKeys] of TOKEN_FIELDS) {
    const value = readFirstNonNegativeInteger(usage, sourceKeys);
    if (value !== null) {
      target[targetKey].seen = true;
      target[targetKey].value += value;
    }
  }
}

function createNullableSumState() {
  return {
    inputTokens: { seen: false, value: 0 },
    outputTokens: { seen: false, value: 0 },
    cacheReadTokens: { seen: false, value: 0 },
    cacheWriteTokens: { seen: false, value: 0 },
    reasoningTokens: { seen: false, value: 0 }
  };
}

function finalizeBreakdown(state) {
  return Object.fromEntries(Object.entries(state).map(([key, entry]) => {
    return [key, entry.seen ? entry.value : null];
  }));
}

function getDailyBucket(buckets, date) {
  const existing = buckets.get(date);
  if (existing !== undefined) {
    return existing;
  }

  const bucket = {
    breakdown: createNullableSumState(),
    totalTokens: 0
  };
  buckets.set(date, bucket);
  return bucket;
}

function getUtcDate(value) {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function readFirstNonNegativeInteger(record, keys) {
  for (const key of keys) {
    const value = readNonNegativeInteger(record[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function readNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function summarizeDiscovery(diagnostics) {
  return diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    severity: diagnostic.severity
  }));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
