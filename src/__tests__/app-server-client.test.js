import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";

import { requestAccountUsageFromAppServer } from "../app-server-client.js";
import { CODEX_USAGE_ERROR_CODES, CodexUsageError } from "../errors.js";

function requestWithResolvedCodex(options = {}) {
  return requestAccountUsageFromAppServer({
    resolveExecutable: async () => "codex",
    ...options
  });
}

test("performs the stable app-server handshake before reading account usage", async () => {
  const messages = [];
  const child = new FakeChild((message) => {
    messages.push(message);

    if (message.id === 0) {
      child.respond({ id: 0, result: { userAgent: "synthetic" } });
    } else if (message.id === 1) {
      child.respond({
        id: 1,
        result: {
          summary: { lifetimeTokens: 100 },
          dailyUsageBuckets: []
        }
      });
    }
  });
  let spawnCall;

  const result = await requestWithResolvedCodex({
    spawnProcess(command, args, options) {
      spawnCall = { command, args, options };
      return child;
    }
  });

  assert.deepEqual(spawnCall, {
    command: "codex",
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
          version: "0.4.1"
        }
      }
    },
    { method: "initialized", params: {} },
    { method: "account/usage/read", id: 1 }
  ]);
  assert.deepEqual(result, {
    summary: { lifetimeTokens: 100 },
    dailyUsageBuckets: []
  });
  assert.equal(child.killed, true);
});

test("spawns a synthetic app bundle executable selected by the resolver", async () => {
  const appCommand = "/synthetic-app/Contents/Resources/codex";
  const child = new FakeChild((message) => {
    if (message.id === 0) {
      child.respond({ id: 0, result: {} });
    } else if (message.id === 1) {
      child.respond({ id: 1, result: { summary: {} } });
    }
  });
  let spawnCommand;

  await requestWithResolvedCodex({
    resolveExecutable: async () => appCommand,
    spawnProcess(command) {
      spawnCommand = command;
      return child;
    }
  });

  assert.equal(spawnCommand, appCommand);
  assert.equal(child.killed, true);
});

test("maps an unavailable resolver result without spawning", async () => {
  let spawned = false;

  await assert.rejects(
    requestWithResolvedCodex({
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

test("maps unexpected resolver failures without exposing details", async () => {
  const privateDetail = "synthetic-private-resolver-detail";

  await assert.rejects(
    requestWithResolvedCodex({
      resolveExecutable: async () => {
        throw new Error(privateDetail);
      }
    }),
    (error) => {
      assert.equal(error.code, CODEX_USAGE_ERROR_CODES.APP_SERVER_START_FAILED);
      assert.equal(String(error).includes(privateDetail), false);
      return true;
    }
  );
});

test("maps a missing resolved Codex executable to a safe error", async () => {
  const child = new FakeChild(() => {});

  await assert.rejects(
    requestWithResolvedCodex({
      spawnProcess() {
        queueMicrotask(() => {
          child.emit(
            "error",
            Object.assign(new Error("private command details"), { code: "ENOENT" })
          );
        });
        return child;
      }
    }),
    (error) => {
      assert.equal(error instanceof CodexUsageError, true);
      assert.equal(error.code, CODEX_USAGE_ERROR_CODES.CODEX_NOT_FOUND);
      assert.equal(String(error).includes("private command details"), false);
      assert.equal(child.killed, true);
      return true;
    }
  );
});

test("maps RPC errors without exposing the upstream message", async () => {
  const child = new FakeChild((message) => {
    if (message.id === 0) {
      child.respond({ id: 0, result: {} });
    } else if (message.id === 1) {
      child.respond({
        id: 1,
        error: {
          code: -32000,
          message: "synthetic-sensitive-upstream-detail"
        }
      });
    }
  });

  await assert.rejects(
    requestWithResolvedCodex({ spawnProcess: () => child }),
    (error) => {
      assert.equal(error.code, CODEX_USAGE_ERROR_CODES.APP_SERVER_RPC_ERROR);
      assert.equal(error.rpcCode, -32000);
      assert.equal(String(error).includes("synthetic-sensitive-upstream-detail"), false);
      assert.equal(child.killed, true);
      return true;
    }
  );
});

test("rejects malformed JSON protocol output", async () => {
  const child = new FakeChild((message) => {
    if (message.id === 0) {
      child.stdout.write("not-json\n");
    }
  });

  await assert.rejects(
    requestWithResolvedCodex({ spawnProcess: () => child }),
    (error) => {
      assert.equal(error.code, CODEX_USAGE_ERROR_CODES.APP_SERVER_PROTOCOL_ERROR);
      assert.equal(child.killed, true);
      return true;
    }
  );
});

test("rejects an early app-server exit", async () => {
  const child = new FakeChild((message) => {
    if (message.id === 0) {
      queueMicrotask(() => child.emit("exit", 1, null));
    }
  });

  await assert.rejects(
    requestWithResolvedCodex({ spawnProcess: () => child }),
    (error) => {
      assert.equal(error.code, CODEX_USAGE_ERROR_CODES.APP_SERVER_EXITED);
      return true;
    }
  );
});

test("times out and stops an unresponsive app-server", async () => {
  const child = new FakeChild(() => {});

  await assert.rejects(
    requestWithResolvedCodex({
      spawnProcess: () => child,
      timeoutMs: 10
    }),
    (error) => {
      assert.equal(error.code, CODEX_USAGE_ERROR_CODES.APP_SERVER_TIMEOUT);
      assert.equal(child.killed, true);
      return true;
    }
  );
});

test("validates timeout bounds before spawning", async () => {
  let spawned = false;

  await assert.rejects(
    requestWithResolvedCodex({
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
