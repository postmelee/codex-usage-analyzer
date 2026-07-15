import { formatAccountUsage } from "./format-account-usage.js";

const UNAVAILABLE = "Unavailable";
const EMPTY_ACTIVITY = "No activity recorded";
const WEEKDAY_LABELS = Object.freeze([
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat"
]);
const HEATMAP_SYMBOLS = Object.freeze([".", ":", "*", "O", "#"]);
const HEATMAP_WEEKS = 52;
const DAYS_PER_WEEK = 7;
const DAY_MS = 86_400_000;

export function formatExperimentalProfile(envelope) {
  return [
    "Codex profile (experimental)",
    `Status  ${envelope.status}`,
    "",
    ...formatProfile(envelope.profile),
    "",
    "Usage",
    formatAccountUsage(envelope.usage),
    "",
    ...formatTokenActivity(envelope.usage),
    "",
    ...formatActivityInsights(envelope.activityInsights),
    "",
    ...formatTopInvocations(envelope.activityInsights?.topInvocations ?? null)
  ].join("\n");
}

function formatProfile(profile) {
  if (profile === null) return ["Profile", UNAVAILABLE];

  return [
    "Profile",
    ...formatRows([
      ["Display name", formatValue(profile.displayName)],
      ["Username", formatUsername(profile.username)],
      ["Avatar", profile.avatarUrl === null ? UNAVAILABLE : "Available"],
      ["Plan", formatValue(profile.planType)]
    ])
  ];
}

function formatTokenActivity(usage) {
  const buckets = usage.dailyUsageBuckets;
  if (buckets === null) return ["Token activity", UNAVAILABLE];
  if (buckets.length === 0) return ["Token activity", EMPTY_ACTIVITY];

  const anchorMs = Date.parse(`${usage.capturedAt.slice(0, 10)}T00:00:00.000Z`);
  const anchor = new Date(anchorMs);
  const currentWeekStartMs = anchorMs - anchor.getUTCDay() * DAY_MS;
  const firstWeekStartMs = currentWeekStartMs
    - (HEATMAP_WEEKS - 1) * DAYS_PER_WEEK * DAY_MS;
  const totals = aggregateBuckets(buckets);
  const cells = [];
  let maximum = 0;

  for (let day = 0; day < DAYS_PER_WEEK; day += 1) {
    const row = [];
    for (let week = 0; week < HEATMAP_WEEKS; week += 1) {
      const dateMs = firstWeekStartMs + (week * DAYS_PER_WEEK + day) * DAY_MS;
      if (dateMs > anchorMs) {
        row.push(null);
        continue;
      }

      const tokens = totals.get(toDateOnly(dateMs)) ?? 0;
      maximum = Math.max(maximum, tokens);
      row.push(tokens);
    }
    cells.push(row);
  }

  return [
    "Token activity",
    ...cells.map((row, index) => (
      `${WEEKDAY_LABELS[index]}  |${row.map((tokens) => (
        tokens === null ? " " : HEATMAP_SYMBOLS[toIntensity(tokens, maximum)]
      )).join("")}|`
    )),
    "Legend  . 0  : 1  * 2  O 3  # 4"
  ];
}

function formatActivityInsights(activity) {
  if (activity === null) return ["Activity insights", UNAVAILABLE];

  return [
    "Activity insights",
    ...formatRows([
      ["Fast mode", formatPercentage(activity.fastModePercent)],
      ["Reasoning effort", formatReasoningEffort(activity)],
      ["Skills explored", formatInteger(activity.skillsExplored)],
      ["Total skill uses", formatInteger(activity.totalSkillsUsed)],
      ["Total threads", formatInteger(activity.totalThreads)]
    ])
  ];
}

function formatTopInvocations(value) {
  if (value === null) return ["Top invocations", UNAVAILABLE];
  if (value.length === 0) return ["Top invocations", "None"];

  return [
    "Top invocations",
    ...formatRows(value.map((invocation) => [
      formatInvocationName(invocation),
      formatInteger(invocation.usageCount)
    ]))
  ];
}

function aggregateBuckets(buckets) {
  const totals = new Map();

  for (const bucket of buckets) {
    const current = totals.get(bucket.startDate) ?? 0;
    const next = current + bucket.tokens;
    totals.set(
      bucket.startDate,
      Number.isSafeInteger(next) ? next : Number.MAX_SAFE_INTEGER
    );
  }

  return totals;
}

function toIntensity(tokens, maximum) {
  if (tokens === 0 || maximum === 0) return 0;
  return Math.ceil((tokens / maximum) * 4);
}

function toDateOnly(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function formatRows(rows) {
  const labelWidth = Math.max(...rows.map(([label]) => label.length));
  return rows.map(([label, value]) => `${label.padEnd(labelWidth)}  ${value}`);
}

function formatUsername(value) {
  if (value === null) return UNAVAILABLE;
  return value.startsWith("@") ? value : `@${value}`;
}

function formatReasoningEffort(activity) {
  const effort = formatValue(activity.reasoningEffort);
  const percentage = formatPercentage(activity.reasoningEffortPercent);

  if (effort === UNAVAILABLE && percentage === UNAVAILABLE) return UNAVAILABLE;
  if (effort === UNAVAILABLE) return `${UNAVAILABLE} (${percentage})`;
  if (percentage === UNAVAILABLE) return `${effort} (share unavailable)`;

  return `${effort} (${percentage})`;
}

function formatInvocationName(invocation) {
  const prefix = invocation.type === "plugin" ? "@" : "$";
  return invocation.name.startsWith(prefix)
    ? invocation.name
    : `${prefix}${invocation.name}`;
}

function formatPercentage(value) {
  return value === null ? UNAVAILABLE : `${value}%`;
}

function formatInteger(value) {
  if (value === null) return UNAVAILABLE;
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
}

function formatValue(value) {
  return value === null ? UNAVAILABLE : value;
}
