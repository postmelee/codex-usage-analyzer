import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";

import { CODEX_USAGE_ERROR_CODES } from "../errors.js";
import {
  EXPERIMENTAL_PROFILE_URL,
  MAX_EXPERIMENTAL_PROFILE_RESPONSE_BYTES,
  readExperimentalProfile
} from "../experimental-profile-client.js";

const CAPTURED_AT = "2026-01-01T00:00:00.000Z";

test("uses one isolated app-server session and one fixed profile request", async () => {
  const messages = [];
  const authToken = createSyntheticToken("synthetic-account-id");
  const child = createSuccessfulChild({ authToken, messages });
  let spawnCall;
  let fetchCall;

  const result = await readExperimentalProfile({
    capturedAt: CAPTURED_AT,
    resolveExecutable: async () => "synthetic-codex",
    spawnProcess(command, args, options) {
      spawnCall = { command, args, options };
      return child;
    },
    async fetchImpl(url, options) {
      fetchCall = { url, options };
      return jsonResponse(createRemoteProfile());
    }
  });

  assert.deepEqual(spawnCall, {
    command: "synthetic-codex",
    args: ["app-server"],
    options: {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    }
  });
  assert.deepEqual(messages, [
    {
      method: "initialize",
      id: 0,
      params: {
        clientInfo: {
          name: "codex_usage_analyzer",
          title: "Codex Usage Analyzer",
          version: "0.3.0"
        }
      }
    },
    { method: "initialized", params: {} },
    { method: "account/usage/read", id: 1 },
    {
      method: "account/read",
      id: 2,
      params: { refreshToken: false }
    },
    {
      method: "getAuthStatus",
      id: 3,
      params: { includeToken: true, refreshToken: false }
    }
  ]);
  assert.equal(fetchCall.url, EXPERIMENTAL_PROFILE_URL);
  assert.equal(fetchCall.options.method, "GET");
  assert.equal(fetchCall.options.credentials, "omit");
  assert.equal(fetchCall.options.redirect, "manual");
  assert.equal(fetchCall.options.headers.Accept, "application/json");
  assert.equal(fetchCall.options.headers.Authorization, `Bearer ${authToken}`);
  assert.equal(
    fetchCall.options.headers["ChatGPT-Account-Id"],
    "synthetic-account-id"
  );
  assert.equal(fetchCall.options.headers.originator, "codex-usage-analyzer");
  assert.equal(
    fetchCall.options.headers["User-Agent"],
    "codex-usage-analyzer/0.3.0"
  );
  assert.equal(fetchCall.options.signal instanceof AbortSignal, true);
  assert.equal(child.killed, true);
  assert.equal(result.status, "ok");
  assert.equal(result.profile.planType, "pro");
  assert.deepEqual(result.usage, createUsageDocument());

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(authToken), false);
  assert.equal(serialized.includes("synthetic-account-id"), false);
  assert.equal(serialized.includes("synthetic-private-email"), false);
});

test("keeps account metadata optional and discards email", async () => {
  const child = createSuccessfulChild({
    accountResponse: {
      error: { code: -32000, message: "synthetic-private-account-error" }
    }
  });

  const result = await readWithChild(child, {
    fetchImpl: async () => jsonResponse(createRemoteProfile())
  });

  assert.equal(result.status, "ok");
  assert.equal(result.profile.planType, null);
  assert.equal(
    JSON.stringify(result).includes("synthetic-private-account-error"),
    false
  );
});

test("returns unavailable without a network call when auth context is invalid", async (t) => {
  const cases = [
    ["auth RPC error", {
      error: { code: -32000, message: "synthetic-private-auth-error" }
    }],
    ["missing auth result", { result: null }],
    ["unsupported auth method", {
      result: {
        authMethod: "apikey",
        authToken: createSyntheticToken("synthetic-account-id")
      }
    }],
    ["missing token", {
      result: { authMethod: "chatgpt", authToken: null }
    }],
    ["malformed token", {
      result: { authMethod: "chatgpt", authToken: "synthetic-not-a-jwt" }
    }],
    ["unsafe token characters", {
      result: {
        authMethod: "chatgpt",
        authToken: `${createSyntheticToken("synthetic-account-id")}\n`
      }
    }],
    ["missing account claim", {
      result: {
        authMethod: "chatgpt",
        authToken: createSyntheticToken(null)
      }
    }],
    ["unsafe account claim", {
      result: {
        authMethod: "chatgptAuthTokens",
        authToken: createSyntheticToken("synthetic\naccount")
      }
    }],
    ["padded account claim", {
      result: {
        authMethod: "chatgpt",
        authToken: createSyntheticToken(" synthetic-account ")
      }
    }]
  ];

  for (const [name, authResponse] of cases) {
    await t.test(name, async () => {
      let fetchCalls = 0;
      const child = createSuccessfulChild({ authResponse });
      const result = await readWithChild(child, {
        fetchImpl: async () => {
          fetchCalls += 1;
          return jsonResponse(createRemoteProfile());
        }
      });

      assert.equal(result.status, "unavailable");
      assert.deepEqual(result.usage, createUsageDocument());
      assert.equal(result.profile, null);
      assert.equal(result.activityInsights, null);
      assert.equal(fetchCalls, 0);
      assert.equal(child.killed, true);
      assert.equal(JSON.stringify(result).includes("synthetic-private"), false);
    });
  }
});

test("maps official usage RPC errors without exposing upstream detail", async () => {
  const child = new FakeChild((message) => {
    if (message.id === 0) {
      child.respond({ id: 0, result: {} });
    } else if (message.id === 1) {
      child.respond({
        id: 1,
        error: {
          code: -32001,
          message: "synthetic-private-usage-error"
        }
      });
    }
  });

  await assert.rejects(
    readWithChild(child),
    (error) => {
      assert.equal(error.code, CODEX_USAGE_ERROR_CODES.APP_SERVER_RPC_ERROR);
      assert.equal(error.rpcCode, -32001);
      assert.equal(String(error).includes("synthetic-private-usage-error"), false);
      assert.equal(child.killed, true);
      return true;
    }
  );
});

test("maps resolver and spawn failures before any network request", async (t) => {
  await t.test("missing runtime", async () => {
    let spawned = false;
    await assert.rejects(
      readExperimentalProfile({
        resolveExecutable: async () => null,
        spawnProcess() {
          spawned = true;
        }
      }),
      (error) => {
        assert.equal(error.code, CODEX_USAGE_ERROR_CODES.CODEX_NOT_FOUND);
        assert.equal(spawned, false);
        return true;
      }
    );
  });

  await t.test("resolver failure", async () => {
    await assert.rejects(
      readExperimentalProfile({
        resolveExecutable: async () => {
          throw new Error("synthetic-private-resolver-detail");
        }
      }),
      (error) => {
        assert.equal(
          error.code,
          CODEX_USAGE_ERROR_CODES.APP_SERVER_START_FAILED
        );
        assert.equal(String(error).includes("synthetic-private"), false);
        return true;
      }
    );
  });

  await t.test("spawn ENOENT", async () => {
    await assert.rejects(
      readExperimentalProfile({
        resolveExecutable: async () => "synthetic-codex",
        spawnProcess() {
          throw Object.assign(new Error("synthetic-private-spawn-detail"), {
            code: "ENOENT"
          });
        }
      }),
      (error) => {
        assert.equal(error.code, CODEX_USAGE_ERROR_CODES.CODEX_NOT_FOUND);
        assert.equal(String(error).includes("synthetic-private"), false);
        return true;
      }
    );
  });
});

test("handles malformed, exited, and timed-out app-server sessions", async (t) => {
  await t.test("malformed protocol", async () => {
    const child = new FakeChild((message) => {
      if (message.id === 0) child.stdout.write("not-json\n");
    });

    await assert.rejects(
      readWithChild(child),
      (error) => {
        assert.equal(
          error.code,
          CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR
        );
        assert.equal(child.killed, true);
        return true;
      }
    );
  });

  await t.test("early exit", async () => {
    const child = new FakeChild((message) => {
      if (message.id === 0) {
        queueMicrotask(() => child.emit("exit", 1, null));
      }
    });

    await assert.rejects(
      readWithChild(child),
      (error) => {
        assert.equal(error.code, CODEX_USAGE_ERROR_CODES.APP_SERVER_EXITED);
        return true;
      }
    );
  });

  await t.test("timeout before usage", async () => {
    const child = new FakeChild(() => {});

    await assert.rejects(
      readWithChild(child, { timeoutMs: 10 }),
      (error) => {
        assert.equal(error.code, CODEX_USAGE_ERROR_CODES.APP_SERVER_TIMEOUT);
        assert.equal(child.killed, true);
        return true;
      }
    );
  });

  await t.test("timeout after usage", async () => {
    const child = new FakeChild((message) => {
      if (message.id === 0) {
        child.respond({ id: 0, result: {} });
      } else if (message.id === 1) {
        child.respond({ id: 1, result: createUsageResult() });
      }
    });
    let fetchCalls = 0;

    const result = await readWithChild(child, {
      timeoutMs: 10,
      fetchImpl: async () => {
        fetchCalls += 1;
        return jsonResponse(createRemoteProfile());
      }
    });

    assert.equal(result.status, "unavailable");
    assert.equal(fetchCalls, 0);
    assert.equal(child.killed, true);
  });
});

test("validates timeout bounds before spawning", async () => {
  let spawned = false;

  await assert.rejects(
    readExperimentalProfile({
      timeoutMs: 0,
      spawnProcess() {
        spawned = true;
      }
    }),
    (error) => {
      assert.equal(error.code, CODEX_USAGE_ERROR_CODES.INVALID_TIMEOUT);
      assert.equal(spawned, false);
      return true;
    }
  );
});

test("maps unsafe HTTP responses to unavailable with no retry", async (t) => {
  const oversized = new Uint8Array(
    MAX_EXPERIMENTAL_PROFILE_RESPONSE_BYTES + 1
  );
  const cases = [
    ["redirect", () => new Response(null, {
      status: 302,
      headers: { "content-type": "application/json" }
    })],
    ["auth denial", () => jsonResponse({}, { status: 401 })],
    ["rate limit", () => jsonResponse({}, { status: 429 })],
    ["server error", () => jsonResponse({}, { status: 500 })],
    ["wrong content type", () => new Response("{}", {
      status: 200,
      headers: { "content-type": "text/plain" }
    })],
    ["malformed JSON", () => new Response("not-json", {
      status: 200,
      headers: { "content-type": "application/json" }
    })],
    ["non-object JSON", () => new Response("[]", {
      status: 200,
      headers: { "content-type": "application/json" }
    })],
    ["oversized declared body", () => new Response("{}", {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": String(MAX_EXPERIMENTAL_PROFILE_RESPONSE_BYTES + 1)
      }
    })],
    ["invalid declared length", () => new Response("{}", {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": "synthetic-invalid"
      }
    })],
    ["oversized streamed body", () => new Response(oversized, {
      status: 200,
      headers: { "content-type": "application/json" }
    })],
    ["invalid UTF-8", () => new Response(new Uint8Array([255]), {
      status: 200,
      headers: { "content-type": "application/json" }
    })],
    ["fetch failure", () => {
      throw new Error("synthetic-private-fetch-detail");
    }]
  ];

  for (const [name, createResponse] of cases) {
    await t.test(name, async () => {
      const child = createSuccessfulChild();
      let fetchCalls = 0;
      const result = await readWithChild(child, {
        fetchImpl: async () => {
          fetchCalls += 1;
          return createResponse();
        }
      });

      assert.equal(result.status, "unavailable");
      assert.equal(result.profile, null);
      assert.equal(result.activityInsights, null);
      assert.equal(fetchCalls, 1);
      assert.equal(child.killed, true);
      assert.equal(JSON.stringify(result).includes("synthetic-private"), false);
    });
  }
});

test("aborts a stalled remote request and does not retry", async () => {
  const child = createSuccessfulChild();
  let fetchCalls = 0;

  const result = await readWithChild(child, {
    timeoutMs: 10,
    fetchImpl: async (_url, options) => {
      fetchCalls += 1;
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          reject(new Error("synthetic-private-timeout-detail"));
        }, { once: true });
      });
    }
  });

  assert.equal(result.status, "unavailable");
  assert.equal(fetchCalls, 1);
  assert.equal(child.killed, true);
});

function readWithChild(child, options = {}) {
  return readExperimentalProfile({
    capturedAt: CAPTURED_AT,
    resolveExecutable: async () => "synthetic-codex",
    spawnProcess: () => child,
    ...options
  });
}

function createSuccessfulChild(options = {}) {
  const authToken = options.authToken
    ?? createSyntheticToken("synthetic-account-id");
  const messages = options.messages ?? [];
  const child = new FakeChild((message) => {
    messages.push(message);

    if (message.id === 0) {
      child.respond({ id: 0, result: {} });
    } else if (message.id === 1) {
      child.respond({ id: 1, result: createUsageResult() });
    } else if (message.id === 2) {
      child.respond({
        id: 2,
        ...(options.accountResponse ?? {
          result: {
            account: {
              type: "chatgpt",
              email: "synthetic-private-email",
              planType: "pro"
            },
            requiresOpenaiAuth: true
          }
        })
      });
    } else if (message.id === 3) {
      child.respond({
        id: 3,
        ...(options.authResponse ?? {
          result: {
            authMethod: "chatgpt",
            authToken,
            requiresOpenaiAuth: true
          }
        })
      });
    }
  });

  return child;
}

function createSyntheticToken(accountId) {
  const authClaim = accountId === null
    ? {}
    : { chatgpt_account_id: accountId };
  const header = Buffer.from(JSON.stringify({ alg: "synthetic" }))
    .toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    "https://api.openai.com/auth": authClaim,
    synthetic_extra_claim: "not-forwarded"
  })).toString("base64url");

  return `${header}.${payload}.synthetic-signature`;
}

function createUsageResult() {
  return {
    summary: {
      lifetimeTokens: 1_000,
      peakDailyTokens: 200,
      longestRunningTurnSec: 300,
      currentStreakDays: 4,
      longestStreakDays: 5
    },
    dailyUsageBuckets: [
      { startDate: "2025-12-31", tokens: 100 }
    ]
  };
}

function createUsageDocument() {
  return {
    contractVersion: 1,
    capturedAt: CAPTURED_AT,
    ...createUsageResult()
  };
}

function createRemoteProfile() {
  return {
    profile: {
      display_name: "Synthetic Name",
      username: "synthetic-user",
      profile_picture_url: "https://example.invalid/avatar.png"
    },
    stats: {
      lifetime_tokens: 10_000,
      peak_daily_tokens: 2_000,
      longest_running_turn_sec: 3_000,
      current_streak_days: 40,
      longest_streak_days: 50,
      daily_usage_buckets: [
        { start_date: "2025-12-31", tokens: 9_999 }
      ],
      fast_mode_usage_percentage: 25,
      most_used_reasoning_effort: "synthetic-effort",
      most_used_reasoning_effort_percentage: 50,
      unique_skills_used: 6,
      total_skills_used: 7,
      total_threads: 8,
      top_invocations: []
    },
    metadata: { stats_error: null }
  };
}

function jsonResponse(value, options = {}) {
  return new Response(JSON.stringify(value), {
    status: options.status ?? 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

class FakeChild extends EventEmitter {
  constructor(onMessage) {
    super();
    this.stdin = new PassThrough();
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.exitCode = null;
    this.killed = false;
    this.#listen(onMessage);
  }

  respond(message) {
    this.stdout.write(`${JSON.stringify(message)}\n`);
  }

  kill() {
    this.killed = true;
    this.exitCode = 0;
    return true;
  }

  #listen(onMessage) {
    let buffer = "";
    this.stdin.setEncoding("utf8");
    this.stdin.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.length > 0) {
          onMessage(JSON.parse(line));
        }
      }
    });
  }
}
