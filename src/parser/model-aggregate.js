import { resolveCodexHome } from "./codex-home.js";
import {
  discoverSessionJsonlFiles,
  normalizeSessionTokenCountEvent,
  readSessionJsonlEntries
} from "./session-jsonl.js";
import {
  addTokenUsageBreakdown,
  createNullableTokenBreakdownState,
  finalizeTokenBreakdown,
  getTokenUsageTotal
} from "./token-aggregate.js";

export async function aggregateModelUsageFromCodexHome(options = {}) {
  const { codexHome, source } = resolveCodexHome(options);
  const discovery = await discoverSessionJsonlFiles(codexHome);
  const aggregate = await aggregateModelUsageFromSessionFiles(discovery.files);

  aggregate.diagnostics.source = source;
  aggregate.diagnostics.discovery = summarizeDiscovery(discovery.diagnostics);

  if (discovery.files.length === 0) {
    aggregate.diagnostics.status = "unavailable";
    aggregate.diagnostics.reason = "session_jsonl_not_found";
  }

  return aggregate;
}

export async function aggregateModelUsageFromSessionFiles(files) {
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

    const tokenEvent = normalizeSessionTokenCountEvent(entry.event);
    if (tokenEvent === null) {
      state.diagnostics.ignoredEvents += 1;
      continue;
    }

    state.diagnostics.tokenEvents += 1;

    const model = readNonEmptyString(tokenEvent.model);
    if (model === null) {
      state.diagnostics.tokenEventsWithoutModel += 1;
      continue;
    }

    state.diagnostics.tokenEventsWithModel += 1;
    applyModelEvent(state, model, tokenEvent);
  }

  return finalizeAggregate(files.length, state);
}

function createAggregateState() {
  return {
    diagnostics: {
      status: "unavailable",
      reason: "no_model_events",
      source: "session_jsonl",
      filesScanned: 0,
      entriesScanned: 0,
      ignoredEvents: 0,
      tokenEvents: 0,
      tokenEventsWithModel: 0,
      tokenEventsWithoutModel: 0,
      tokenEventsWithUsage: 0,
      malformedLines: 0,
      fileErrors: 0,
      discovery: []
    },
    models: new Map()
  };
}

function applyModelEvent(state, model, tokenEvent) {
  const item = getModelUsageState(state.models, model);
  item.usageCount += 1;

  if (tokenEvent.lastTokenUsage === null) {
    return;
  }

  const totalTokens = getTokenUsageTotal(tokenEvent.lastTokenUsage);
  if (totalTokens === null) {
    return;
  }

  item.hasTokens = true;
  item.totalTokens += totalTokens;
  state.diagnostics.tokenEventsWithUsage += 1;
  addTokenUsageBreakdown(item.breakdown, tokenEvent.lastTokenUsage);
}

function finalizeAggregate(filesScanned, state) {
  const items = Array.from(state.models.values())
    .map(finalizeModelUsage)
    .sort(compareModelUsage);

  const hasModels = items.length > 0;
  state.diagnostics.filesScanned = filesScanned;
  state.diagnostics.status = hasModels ? "ok" : state.diagnostics.status;
  state.diagnostics.reason = hasModels ? null : state.diagnostics.reason;

  return {
    diagnostics: state.diagnostics,
    models: {
      favoriteModel: items[0] ?? null,
      items
    }
  };
}

function getModelUsageState(models, model) {
  const existing = models.get(model);
  if (existing !== undefined) {
    return existing;
  }

  const item = {
    breakdown: createNullableTokenBreakdownState(),
    hasTokens: false,
    model,
    totalTokens: 0,
    usageCount: 0
  };
  models.set(model, item);
  return item;
}

function finalizeModelUsage(item) {
  return {
    model: item.model,
    displayName: null,
    totalTokens: item.hasTokens ? item.totalTokens : null,
    usageCount: item.usageCount,
    basis: item.hasTokens ? "tokens" : "usage_count",
    ...finalizeTokenBreakdown(item.breakdown)
  };
}

function compareModelUsage(left, right) {
  const tokenDiff = (right.totalTokens ?? -1) - (left.totalTokens ?? -1);
  if (tokenDiff !== 0) return tokenDiff;

  const countDiff = (right.usageCount ?? -1) - (left.usageCount ?? -1);
  if (countDiff !== 0) return countDiff;

  return left.model.localeCompare(right.model);
}

function readNonEmptyString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function summarizeDiscovery(diagnostics) {
  return diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    severity: diagnostic.severity
  }));
}
