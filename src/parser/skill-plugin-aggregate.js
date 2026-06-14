import { resolveCodexHome } from "./codex-home.js";
import {
  discoverSessionJsonlFiles,
  normalizeSessionToolCatalogEvent,
  normalizeSessionToolInvocationEvent,
  readSessionJsonlEntries
} from "./session-jsonl.js";

const TOP_LIMIT = 10;

export async function aggregateSkillPluginUsageFromCodexHome(options = {}) {
  const { codexHome, source } = resolveCodexHome(options);
  const discovery = await discoverSessionJsonlFiles(codexHome);
  const aggregate = await aggregateSkillPluginUsageFromSessionFiles(discovery.files);

  aggregate.diagnostics.source = source;
  aggregate.diagnostics.discovery = summarizeDiscovery(discovery.diagnostics);

  if (discovery.files.length === 0) {
    aggregate.diagnostics.status = "unavailable";
    aggregate.diagnostics.reason = "session_jsonl_not_found";
  }

  return aggregate;
}

export async function aggregateSkillPluginUsageFromSessionFiles(files) {
  const state = createAggregateState();

  for await (const entry of readSessionJsonlEntries(files)) {
    updateFileContext(state, entry);
    state.diagnostics.entriesScanned += 1;

    if (entry.kind === "malformed_line") {
      state.diagnostics.malformedLines += 1;
      continue;
    }

    if (entry.kind === "file_error") {
      state.diagnostics.fileErrors += 1;
      continue;
    }

    const catalog = normalizeSessionToolCatalogEvent(entry.event);
    if (catalog !== null) {
      state.diagnostics.catalogEvents += 1;
      applyCatalogEvent(state, catalog);
      continue;
    }

    const invocation = normalizeSessionToolInvocationEvent(entry.event);
    if (invocation === null) {
      state.diagnostics.ignoredEvents += 1;
      continue;
    }

    applyInvocationEvent(state, invocation);
  }

  return finalizeAggregate(files.length, state);
}

function createAggregateState() {
  return {
    currentCatalog: new Map(),
    currentFile: null,
    diagnostics: {
      status: "unavailable",
      reason: "no_skill_plugin_invocations",
      source: "session_jsonl",
      filesScanned: 0,
      entriesScanned: 0,
      ignoredEvents: 0,
      catalogEvents: 0,
      catalogItems: 0,
      actualInvocationEvents: 0,
      classifiedSkillInvocations: 0,
      classifiedPluginInvocations: 0,
      unclassifiedInvocations: 0,
      malformedLines: 0,
      fileErrors: 0,
      topLimit: TOP_LIMIT,
      classificationBasis: "actual_invocation_with_session_catalog",
      discovery: []
    },
    plugins: new Map(),
    skills: new Map()
  };
}

function updateFileContext(state, entry) {
  if (entry.file === undefined || entry.file === state.currentFile) {
    return;
  }

  state.currentCatalog = new Map();
  state.currentFile = entry.file;
}

function applyCatalogEvent(state, catalog) {
  for (const item of catalog.items) {
    const kind = item.namespace === null ? "skill" : "plugin";
    state.currentCatalog.set(item.name, {
      id: createRankingId(kind, item.name, item.namespace),
      kind,
      name: item.name
    });
    state.diagnostics.catalogItems += 1;
  }
}

function applyInvocationEvent(state, invocation) {
  state.diagnostics.actualInvocationEvents += 1;

  const catalogItem = state.currentCatalog.get(invocation.name);
  const classified = catalogItem ?? classifyStandaloneInvocation(invocation);
  if (classified === null) {
    state.diagnostics.unclassifiedInvocations += 1;
    return;
  }

  const target = classified.kind === "skill" ? state.skills : state.plugins;
  const item = getRankingState(target, classified);
  item.usageCount += 1;

  if (classified.kind === "skill") {
    state.diagnostics.classifiedSkillInvocations += 1;
  } else {
    state.diagnostics.classifiedPluginInvocations += 1;
  }
}

function classifyStandaloneInvocation(invocation) {
  if (invocation.kind !== "dynamic_request" || invocation.namespace === null) {
    return null;
  }

  return {
    id: createRankingId("plugin", invocation.name, invocation.namespace),
    kind: "plugin",
    name: invocation.name
  };
}

function createRankingId(kind, name, namespace) {
  if (kind === "plugin" && namespace !== null) {
    return `${namespace}/${name}`;
  }

  return name;
}

function getRankingState(items, classified) {
  const existing = items.get(classified.id);
  if (existing !== undefined) {
    return existing;
  }

  const item = {
    displayName: classified.name,
    id: classified.id,
    name: classified.name,
    usageCount: 0
  };
  items.set(item.id, item);
  return item;
}

function finalizeAggregate(filesScanned, state) {
  const topSkills = finalizeRanking(state.skills);
  const topPlugins = finalizeRanking(state.plugins);
  const hasClassifiedInvocations = topSkills.length > 0 || topPlugins.length > 0;

  state.diagnostics.filesScanned = filesScanned;
  state.diagnostics.status = hasClassifiedInvocations ? "ok" : state.diagnostics.status;
  state.diagnostics.reason = hasClassifiedInvocations ? null : state.diagnostics.reason;

  return {
    diagnostics: state.diagnostics,
    skills: {
      exploredCount: hasClassifiedInvocations ? state.skills.size : null,
      totalUsed: hasClassifiedInvocations ? state.diagnostics.classifiedSkillInvocations : null,
      topSkills
    },
    plugins: {
      topPlugins
    }
  };
}

function finalizeRanking(items) {
  return Array.from(items.values())
    .sort(compareRankingItem)
    .slice(0, TOP_LIMIT)
    .map((item) => ({
      id: item.id,
      name: item.name,
      displayName: item.displayName,
      usageCount: item.usageCount
    }));
}

function compareRankingItem(left, right) {
  const countDiff = right.usageCount - left.usageCount;
  if (countDiff !== 0) return countDiff;

  const displayNameDiff = compareNullableString(left.displayName, right.displayName);
  if (displayNameDiff !== 0) return displayNameDiff;

  const nameDiff = compareNullableString(left.name, right.name);
  if (nameDiff !== 0) return nameDiff;

  return left.id.localeCompare(right.id);
}

function compareNullableString(left, right) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left.localeCompare(right);
}

function summarizeDiscovery(diagnostics) {
  return diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    severity: diagnostic.severity
  }));
}
