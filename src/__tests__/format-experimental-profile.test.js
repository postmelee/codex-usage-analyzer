import assert from "node:assert/strict";
import test from "node:test";

import { formatExperimentalProfile } from "../format-experimental-profile.js";

test("formats profile, canonical usage, activity, and invocations in order", () => {
  const envelope = createEnvelope();
  const output = formatExperimentalProfile(envelope);

  assert.match(output, /^Codex profile \(experimental\)\nStatus  ok\n/u);
  assert.match(output, /Display name  Synthetic Name/u);
  assert.match(output, /Username      @synthetic-user/u);
  assert.match(output, /Avatar        Available/u);
  assert.match(output, /Plan          synthetic-plan/u);
  assert.equal(output.includes(envelope.profile.avatarUrl), false);
  assert.match(output, /Usage\nCodex account usage\n/u);
  assert.match(output, /Lifetime tokens\s+14\.35B/u);
  assert.match(output, /Fast mode\s+35%/u);
  assert.match(output, /Reasoning effort\s+high \(76%\)/u);
  assert.match(output, /Skills explored\s+56/u);
  assert.match(output, /Total skill uses\s+4,847/u);
  assert.match(output, /Total threads\s+2,101/u);
  assert.match(output, /\$synthetic-skill\s+779/u);
  assert.match(output, /@synthetic-plugin\s+560/u);

  const headings = [
    "Profile",
    "Usage",
    "Token activity",
    "Activity insights",
    "Top invocations"
  ];
  const positions = headings.map((heading) => output.indexOf(`\n${heading}\n`));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
});

test("renders a Sunday-start 52-week heatmap with bounded relative intensity", () => {
  const envelope = createEnvelope({
    dailyUsageBuckets: [
      { startDate: "2025-07-19", tokens: 9_000 },
      { startDate: "2025-07-20", tokens: 400 },
      { startDate: "2026-07-10", tokens: 50 },
      { startDate: "2026-07-12", tokens: 400 },
      { startDate: "2026-07-13", tokens: 101 },
      { startDate: "2026-07-13", tokens: 101 },
      { startDate: "2026-07-14", tokens: 200 },
      { startDate: "2026-07-15", tokens: 300 },
      { startDate: "2026-07-16", tokens: 400 }
    ]
  });
  const output = formatExperimentalProfile(envelope);
  const rows = Object.fromEntries(output.split("\n")
    .filter((line) => /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)  \|/u.test(line))
    .map((line) => [line.slice(0, 3), line.slice(6, -1)]));

  assert.deepEqual(Object.keys(rows), ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  assert.equal(rows.Sun.length, 52);
  assert.equal(rows.Sun[0], "#");
  assert.equal(rows.Sun.at(-1), "#");
  assert.equal(rows.Mon.at(-1), "O");
  assert.equal(rows.Tue.at(-1), "*");
  assert.equal(rows.Wed.at(-1), "O");
  assert.equal(rows.Thu.at(-1), " ");
  assert.equal(rows.Fri.at(-2), ":");
  assert.equal(rows.Fri.at(-1), " ");
  assert.match(output, /Legend  \. 0  : 1  \* 2  O 3  # 4/u);
});

test("distinguishes unavailable and empty token activity", () => {
  const unavailable = formatExperimentalProfile(createEnvelope({
    dailyUsageBuckets: null
  }));
  const empty = formatExperimentalProfile(createEnvelope({
    dailyUsageBuckets: []
  }));

  assert.match(unavailable, /Token activity\nUnavailable/u);
  assert.equal(unavailable.includes("No activity recorded"), false);
  assert.match(empty, /Token activity\nNo activity recorded/u);
  assert.equal(empty.includes("Sun  |"), false);
});

test("keeps unavailable profile and activity distinct from empty invocations", () => {
  const unavailable = formatExperimentalProfile({
    ...createEnvelope(),
    status: "unavailable",
    profile: null,
    activityInsights: null
  });
  const empty = formatExperimentalProfile(createEnvelope({
    topInvocations: []
  }));

  assert.match(unavailable, /Profile\nUnavailable/u);
  assert.match(unavailable, /Activity insights\nUnavailable/u);
  assert.match(unavailable, /Top invocations\nUnavailable/u);
  assert.match(empty, /Top invocations\nNone/u);
});

test("preserves zero values and partial reasoning fields", () => {
  const envelope = createEnvelope();
  envelope.profile = {
    displayName: null,
    username: "@synthetic-user",
    avatarUrl: null,
    planType: null
  };
  envelope.activityInsights = {
    fastModePercent: 0,
    reasoningEffort: "medium",
    reasoningEffortPercent: null,
    skillsExplored: 0,
    totalSkillsUsed: null,
    totalThreads: 0,
    topInvocations: []
  };
  const output = formatExperimentalProfile(envelope);

  assert.match(output, /Display name\s+Unavailable/u);
  assert.match(output, /Username\s+@synthetic-user/u);
  assert.match(output, /Avatar\s+Unavailable/u);
  assert.match(output, /Fast mode\s+0%/u);
  assert.match(output, /Reasoning effort\s+medium \(share unavailable\)/u);
  assert.match(output, /Skills explored\s+0/u);
  assert.match(output, /Total skill uses\s+Unavailable/u);
  assert.match(output, /Total threads\s+0/u);

  envelope.activityInsights.reasoningEffort = null;
  envelope.activityInsights.reasoningEffortPercent = 50;
  const percentageOnly = formatExperimentalProfile(envelope);
  assert.match(
    percentageOnly,
    /Reasoning effort\s+Unavailable \(50%\)/u
  );
});

test("does not duplicate invocation presentation prefixes", () => {
  const output = formatExperimentalProfile(createEnvelope({
    topInvocations: [
      { type: "skill", name: "$synthetic-skill", usageCount: 1 },
      { type: "plugin", name: "@synthetic-plugin", usageCount: 2 }
    ]
  }));

  assert.match(output, /\$synthetic-skill\s+1/u);
  assert.match(output, /@synthetic-plugin\s+2/u);
  assert.equal(output.includes("$$synthetic-skill"), false);
  assert.equal(output.includes("@@synthetic-plugin"), false);
});

function createEnvelope(options = {}) {
  return {
    fullProfileContractVersion: 1,
    kind: "codex-usage-analyzer.fullProfile",
    stability: "experimental",
    status: "ok",
    usage: {
      contractVersion: 1,
      capturedAt: "2026-07-15T12:00:00.000Z",
      summary: {
        lifetimeTokens: 14_350_000_000,
        peakDailyTokens: 700_000_000,
        longestRunningTurnSec: 27_180,
        currentStreakDays: 10,
        longestStreakDays: 49
      },
      dailyUsageBuckets: Object.hasOwn(options, "dailyUsageBuckets")
        ? options.dailyUsageBuckets
        : []
    },
    profile: {
      displayName: "Synthetic Name",
      username: "synthetic-user",
      avatarUrl: "https://example.invalid/avatar.png",
      planType: "synthetic-plan"
    },
    activityInsights: {
      fastModePercent: 35,
      reasoningEffort: "high",
      reasoningEffortPercent: 76,
      skillsExplored: 56,
      totalSkillsUsed: 4_847,
      totalThreads: 2_101,
      topInvocations: Object.hasOwn(options, "topInvocations")
        ? options.topInvocations
        : [
          { type: "skill", name: "synthetic-skill", usageCount: 779 },
          { type: "plugin", name: "synthetic-plugin", usageCount: 560 }
        ]
    }
  };
}
