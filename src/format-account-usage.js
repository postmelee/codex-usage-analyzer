const UNAVAILABLE = "Unavailable";

export function formatAccountUsage(usage) {
  const rows = [
    ["Lifetime tokens", formatCompactInteger(usage.summary.lifetimeTokens)],
    ["Peak daily tokens", formatCompactInteger(usage.summary.peakDailyTokens)],
    ["Longest turn", formatDuration(usage.summary.longestRunningTurnSec)],
    ["Current streak", formatDays(usage.summary.currentStreakDays)],
    ["Longest streak", formatDays(usage.summary.longestStreakDays)],
    ["Daily buckets", formatBucketCount(usage.dailyUsageBuckets)]
  ];
  const labelWidth = Math.max(...rows.map(([label]) => label.length));

  return [
    "Codex account usage",
    "",
    ...rows.map(([label, value]) => `${label.padEnd(labelWidth)}  ${value}`),
    "",
    `Captured at ${usage.capturedAt}`
  ].join("\n");
}

function formatCompactInteger(value) {
  if (value === null) return UNAVAILABLE;

  const units = [
    [1_000_000_000_000, "T"],
    [1_000_000_000, "B"],
    [1_000_000, "M"],
    [1_000, "K"]
  ];

  for (const [divisor, suffix] of units) {
    if (value >= divisor) {
      const scaled = value / divisor;
      return `${trimTrailingZeros(scaled.toFixed(2))}${suffix}`;
    }
  }

  return String(value);
}

function formatDuration(value) {
  if (value === null) return UNAVAILABLE;
  if (value === 0) return "0s";

  let remaining = value;
  const units = [
    [86_400, "d"],
    [3_600, "h"],
    [60, "m"],
    [1, "s"]
  ];
  const parts = [];

  for (const [seconds, suffix] of units) {
    const amount = Math.floor(remaining / seconds);
    if (amount > 0) {
      parts.push(`${amount}${suffix}`);
      remaining -= amount * seconds;
    }

    if (parts.length === 2) break;
  }

  return parts.join(" ");
}

function formatDays(value) {
  if (value === null) return UNAVAILABLE;
  return `${value} ${value === 1 ? "day" : "days"}`;
}

function formatBucketCount(value) {
  if (value === null) return UNAVAILABLE;
  return `${value.length} ${value.length === 1 ? "day" : "days"}`;
}

function trimTrailingZeros(value) {
  return value.replace(/\.0+$/u, "").replace(/(\.\d*?)0+$/u, "$1");
}
