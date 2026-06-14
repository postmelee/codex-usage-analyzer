import { resolveCodexHome } from "./codex-home.js";
import {
  discoverSessionJsonlFiles,
  normalizeSessionTokenCountEvent,
  readSessionJsonlEntries
} from "./session-jsonl.js";
import {
  getTokenUsageTotal,
  getUtcDate
} from "./token-aggregate.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function aggregateActivityFromCodexHome(options = {}) {
  const { codexHome, source } = resolveCodexHome(options);
  const discovery = await discoverSessionJsonlFiles(codexHome);
  const aggregate = await aggregateActivityFromSessionFiles(discovery.files, options);

  aggregate.diagnostics.source = source;
  aggregate.diagnostics.discovery = summarizeDiscovery(discovery.diagnostics);

  if (discovery.files.length === 0) {
    aggregate.diagnostics.status = "unavailable";
    aggregate.diagnostics.reason = "session_jsonl_not_found";
  }

  return aggregate;
}

export async function aggregateActivityFromSessionFiles(files, options = {}) {
  const state = createAggregateState(normalizeNow(options.now));

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
    applyDuration(state, tokenEvent.durationMs);
    applyEffort(state, tokenEvent.effort);
    applyModeDiagnostic(state, tokenEvent.mode);
    applyUsageDate(state, tokenEvent);
  }

  return finalizeAggregate(files.length, state);
}

function createAggregateState(now) {
  return {
    datesWithUsage: new Set(),
    diagnostics: {
      status: "unavailable",
      reason: "no_activity_events",
      source: "session_jsonl",
      filesScanned: 0,
      entriesScanned: 0,
      ignoredEvents: 0,
      tokenEvents: 0,
      tokenEventsWithDateUsage: 0,
      tokenEventsWithDuration: 0,
      tokenEventsWithEffort: 0,
      tokenEventsWithMode: 0,
      malformedLines: 0,
      fileErrors: 0,
      unavailableFields: ["fastModePercent"],
      fastModeReason: "source_unconfirmed",
      streakDateBasis: "utc_date_from_session_token_usage",
      profileParity: "not_guaranteed",
      profileParityReason: "remote_profile_api_not_used",
      discovery: []
    },
    effortCounts: new Map(),
    effortOrder: new Map(),
    longestTaskDurationMs: null,
    now
  };
}

function applyDuration(state, value) {
  const durationMs = readNonNegativeInteger(value);
  if (durationMs === null) {
    return;
  }

  state.diagnostics.tokenEventsWithDuration += 1;
  state.longestTaskDurationMs = Math.max(state.longestTaskDurationMs ?? 0, durationMs);
}

function applyEffort(state, value) {
  const effort = readNonEmptyString(value);
  if (effort === null) {
    return;
  }

  state.diagnostics.tokenEventsWithEffort += 1;
  state.effortCounts.set(effort, (state.effortCounts.get(effort) ?? 0) + 1);
  if (!state.effortOrder.has(effort)) {
    state.effortOrder.set(effort, state.effortOrder.size);
  }
}

function applyModeDiagnostic(state, value) {
  if (readNonEmptyString(value) !== null) {
    state.diagnostics.tokenEventsWithMode += 1;
  }
}

function applyUsageDate(state, tokenEvent) {
  if (tokenEvent.lastTokenUsage === null) {
    return;
  }

  const totalTokens = getTokenUsageTotal(tokenEvent.lastTokenUsage);
  if (totalTokens === null || totalTokens <= 0) {
    return;
  }

  const date = getUtcDate(tokenEvent.timestamp);
  if (date === null) {
    return;
  }

  state.diagnostics.tokenEventsWithDateUsage += 1;
  state.datesWithUsage.add(date);
}

function finalizeAggregate(filesScanned, state) {
  const effort = getDominantEffort(state);
  const streak = calculateStreaks(state.datesWithUsage, state.now);
  const hasActivity = filesScanned > 0 || state.diagnostics.tokenEvents > 0;

  state.diagnostics.filesScanned = filesScanned;
  state.diagnostics.status = hasActivity ? "ok" : state.diagnostics.status;
  state.diagnostics.reason = hasActivity ? null : state.diagnostics.reason;

  return {
    activity: {
      longestTaskDurationMs: state.longestTaskDurationMs,
      currentStreakDays: streak.currentStreakDays,
      longestStreakDays: streak.longestStreakDays,
      fastModePercent: null,
      reasoningEffort: effort?.name ?? null,
      reasoningEffortPercent: effort?.percent ?? null,
      totalThreads: filesScanned > 0 ? filesScanned : null
    },
    diagnostics: state.diagnostics
  };
}

function getDominantEffort(state) {
  const total = state.diagnostics.tokenEventsWithEffort;
  if (total === 0) {
    return null;
  }

  const [name, count] = Array.from(state.effortCounts.entries())
    .sort(([leftName, leftCount], [rightName, rightCount]) => {
      const countDiff = rightCount - leftCount;
      if (countDiff !== 0) return countDiff;

      const orderDiff = state.effortOrder.get(leftName) - state.effortOrder.get(rightName);
      if (orderDiff !== 0) return orderDiff;

      return leftName.localeCompare(rightName);
    })[0];

  return {
    name,
    percent: roundPercent((count / total) * 100)
  };
}

function calculateStreaks(dates, now) {
  if (dates.size === 0) {
    return {
      currentStreakDays: null,
      longestStreakDays: null
    };
  }

  const dayNumbers = Array.from(dates)
    .map(dateToDayNumber)
    .sort((left, right) => left - right);

  let longest = 0;
  let run = 0;
  let previous = null;

  for (const dayNumber of dayNumbers) {
    run = previous !== null && dayNumber === previous + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = dayNumber;
  }

  const nowDay = dateToDayNumber(getUtcDate(now.toISOString()));
  let current = 0;
  for (let day = nowDay; dates.has(dayNumberToDate(day)); day -= 1) {
    current += 1;
  }

  return {
    currentStreakDays: current,
    longestStreakDays: longest
  };
}

function normalizeNow(value) {
  if (value === undefined || value === null) {
    return new Date();
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("now must be a valid date");
  }

  return date;
}

function dateToDayNumber(date) {
  return Math.floor(Date.parse(`${date}T00:00:00.000Z`) / MS_PER_DAY);
}

function dayNumberToDate(dayNumber) {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

function readNonEmptyString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function roundPercent(value) {
  return Math.round(value * 100) / 100;
}

function summarizeDiscovery(diagnostics) {
  return diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    severity: diagnostic.severity
  }));
}
