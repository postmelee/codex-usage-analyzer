import assert from "node:assert/strict";
import test from "node:test";

import { resolveCodexExecutable } from "../codex-executable.js";

const SYNTHETIC_HOME = "/synthetic-user";
const SYNTHETIC_PATH = "/synthetic-bin:/secondary-bin";
const PATH_CANDIDATES = [
  "/synthetic-bin/codex",
  "/secondary-bin/codex"
];
const APP_CANDIDATES = [
  "/Applications/ChatGPT.app/Contents/Resources/codex",
  "/Applications/Codex.app/Contents/Resources/codex",
  `${SYNTHETIC_HOME}/Applications/ChatGPT.app/Contents/Resources/codex`,
  `${SYNTHETIC_HOME}/Applications/Codex.app/Contents/Resources/codex`
];

test("preserves the existing Codex command on non-macOS platforms", async () => {
  let probes = 0;

  const command = await resolveCodexExecutable({
    platform: "linux",
    isExecutable() {
      probes += 1;
      return true;
    }
  });

  assert.equal(command, "codex");
  assert.equal(probes, 0);
});

test("prefers an executable Codex command on PATH before app bundles", async () => {
  const candidates = [];

  const command = await resolveCodexExecutable({
    platform: "darwin",
    env: { PATH: SYNTHETIC_PATH },
    homeDir: SYNTHETIC_HOME,
    isExecutable(candidate) {
      candidates.push(candidate);
      return candidate === PATH_CANDIDATES[1];
    }
  });

  assert.equal(command, "codex");
  assert.deepEqual(candidates, PATH_CANDIDATES);
});

for (const [index, appCandidate] of APP_CANDIDATES.entries()) {
  test(`selects macOS app candidate ${index + 1} in fixed order`, async () => {
    const candidates = [];

    const command = await resolveCodexExecutable({
      platform: "darwin",
      env: { PATH: SYNTHETIC_PATH },
      homeDir: SYNTHETIC_HOME,
      isExecutable(candidate) {
        candidates.push(candidate);
        return candidate === appCandidate;
      }
    });

    assert.equal(command, appCandidate);
    assert.deepEqual(candidates, [
      ...PATH_CANDIDATES,
      ...APP_CANDIDATES.slice(0, index + 1)
    ]);
  });
}

test("returns null when PATH and fixed app candidates are unavailable", async () => {
  const candidates = [];

  const command = await resolveCodexExecutable({
    platform: "darwin",
    env: { PATH: SYNTHETIC_PATH },
    homeDir: SYNTHETIC_HOME,
    isExecutable(candidate) {
      candidates.push(candidate);
      return false;
    }
  });

  assert.equal(command, null);
  assert.deepEqual(candidates, [...PATH_CANDIDATES, ...APP_CANDIDATES]);
});

test("treats candidate inspection failures as unavailable without exposing details", async () => {
  const privateDetail = "synthetic-private-probe-detail";
  let probes = 0;

  const command = await resolveCodexExecutable({
    platform: "darwin",
    env: { PATH: SYNTHETIC_PATH },
    homeDir: SYNTHETIC_HOME,
    isExecutable(candidate) {
      probes += 1;
      if (probes === 1) {
        throw new Error(privateDetail);
      }
      return candidate === APP_CANDIDATES[0];
    }
  });

  assert.equal(command, APP_CANDIDATES[0]);
  assert.equal(String(command).includes(privateDetail), false);
});

test("falls back to app candidates when PATH is absent", async () => {
  const candidates = [];

  const command = await resolveCodexExecutable({
    platform: "darwin",
    env: {},
    homeDir: SYNTHETIC_HOME,
    isExecutable(candidate) {
      candidates.push(candidate);
      return candidate === APP_CANDIDATES[0];
    }
  });

  assert.equal(command, APP_CANDIDATES[0]);
  assert.deepEqual(candidates, [APP_CANDIDATES[0]]);
});
