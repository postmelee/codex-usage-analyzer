import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { aggregateSkillPluginUsageFromCodexHome } from "../parser/skill-plugin-aggregate.js";

const skillPluginFixtureCodexHome = fileURLToPath(new URL("./fixtures/skill-plugin", import.meta.url));
const missingParserFixtureCodexHome = fileURLToPath(new URL("./fixtures/parser-missing", import.meta.url));

test("aggregates skill and plugin rankings from actual invocation fixtures", async () => {
  const result = await aggregateSkillPluginUsageFromCodexHome({
    codexHome: skillPluginFixtureCodexHome
  });

  assert.equal(result.diagnostics.status, "ok");
  assert.equal(result.diagnostics.reason, null);
  assert.equal(result.diagnostics.source, "option");
  assert.equal(result.diagnostics.filesScanned, 1);
  assert.equal(result.diagnostics.entriesScanned, 9);
  assert.equal(result.diagnostics.ignoredEvents, 0);
  assert.equal(result.diagnostics.catalogEvents, 1);
  assert.equal(result.diagnostics.catalogItems, 4);
  assert.equal(result.diagnostics.actualInvocationEvents, 8);
  assert.equal(result.diagnostics.classifiedSkillInvocations, 4);
  assert.equal(result.diagnostics.classifiedPluginInvocations, 3);
  assert.equal(result.diagnostics.unclassifiedInvocations, 1);
  assert.equal(result.diagnostics.malformedLines, 0);
  assert.equal(result.diagnostics.fileErrors, 0);
  assert.equal(result.diagnostics.topLimit, 10);
  assert.equal(result.diagnostics.classificationBasis, "actual_invocation_with_session_catalog");
  assert.equal(JSON.stringify(result.diagnostics).includes(skillPluginFixtureCodexHome), false);
  assert.equal(JSON.stringify(result.diagnostics).includes("lineNumber"), false);
  assert.deepEqual(result.skills, {
    exploredCount: 2,
    totalUsed: 4,
    topSkills: [
      {
        id: "skill_alpha",
        name: "skill_alpha",
        displayName: "skill_alpha",
        usageCount: 2
      },
      {
        id: "skill_beta",
        name: "skill_beta",
        displayName: "skill_beta",
        usageCount: 2
      }
    ]
  });
  assert.deepEqual(result.plugins, {
    topPlugins: [
      {
        id: "plugin_pack/plugin_alpha",
        name: "plugin_alpha",
        displayName: "plugin_alpha",
        usageCount: 2
      },
      {
        id: "plugin_pack/plugin_beta",
        name: "plugin_beta",
        displayName: "plugin_beta",
        usageCount: 1
      }
    ]
  });
});

test("returns unavailable skill and plugin aggregates when session source is missing", async () => {
  const result = await aggregateSkillPluginUsageFromCodexHome({
    codexHome: missingParserFixtureCodexHome
  });

  assert.equal(result.diagnostics.status, "unavailable");
  assert.equal(result.diagnostics.reason, "session_jsonl_not_found");
  assert.deepEqual(result.skills, {
    exploredCount: null,
    totalUsed: null,
    topSkills: []
  });
  assert.deepEqual(result.plugins, {
    topPlugins: []
  });
});
