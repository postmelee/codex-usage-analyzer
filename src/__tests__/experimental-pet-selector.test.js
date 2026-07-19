import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";

import { selectExperimentalPet } from "../experimental-pet-selector.js";

const catalog = [
  { key: 1, displayName: "First Pet", selected: false },
  { key: 2, displayName: "Second Pet", selected: true },
  { key: 3, displayName: null, selected: false }
];

test("selects catalog entries with arrows and restores terminal state", async () => {
  const input = new FakeTtyInput();
  const output = createOutput();
  const selection = selectExperimentalPet(catalog, { input, output });

  input.emit("keypress", "", { name: "down" });
  input.emit("keypress", "", { name: "return" });

  assert.equal(await selection, 3);
  assert.deepEqual(input.rawModes, [true, false]);
  assert.equal(input.listenerCount("keypress"), 0);
  assert.match(output.value, /Select a custom Codex pet/u);
  assert.match(output.value, /\[3\] Custom pet 3/u);
  assert.equal(output.value.includes("undefined"), false);
});

test("wraps arrow navigation and supports escape or control-c cancellation", async (t) => {
  await t.test("wrap up", async () => {
    const input = new FakeTtyInput();
    const output = createOutput();
    const selection = selectExperimentalPet([
      { key: 1, displayName: "First Pet", selected: false },
      { key: 2, displayName: "Second Pet", selected: false }
    ], { input, output });

    input.emit("keypress", "", { name: "up" });
    input.emit("keypress", "", { name: "enter" });
    assert.equal(await selection, 2);
  });

  for (const [name, key] of [
    ["escape", { name: "escape" }],
    ["control-c", { name: "c", ctrl: true }]
  ]) {
    await t.test(name, async () => {
      const input = new FakeTtyInput();
      const output = createOutput();
      const selection = selectExperimentalPet(catalog, { input, output });

      input.emit("keypress", "", key);
      assert.equal(await selection, null);
      assert.deepEqual(input.rawModes, [true, false]);
      assert.equal(input.listenerCount("keypress"), 0);
    });
  }
});

test("does not wait for non-TTY, empty, or invalid catalogs", async () => {
  const cases = [
    { catalog, input: new FakeTtyInput({ isTTY: false }) },
    { catalog: [], input: new FakeTtyInput() },
    {
      catalog: [{ key: 0, displayName: "Invalid", selected: false }],
      input: new FakeTtyInput()
    }
  ];

  for (const value of cases) {
    const output = createOutput();
    assert.equal(await selectExperimentalPet(value.catalog, {
      input: value.input,
      output
    }), null);
    assert.deepEqual(value.input.rawModes, []);
    assert.equal(output.value, "");
  }
});

test("sanitizes labels and restores raw mode after output failure", async () => {
  const safeInput = new FakeTtyInput();
  const safeOutput = createOutput();
  const safeSelection = selectExperimentalPet([
    { key: 7, displayName: "unsafe\nlabel", selected: false }
  ], { input: safeInput, output: safeOutput });
  safeInput.emit("keypress", "", { name: "return" });

  assert.equal(await safeSelection, 7);
  assert.match(safeOutput.value, /\[7\] Custom pet 7/u);
  assert.equal(safeOutput.value.includes("unsafe\nlabel"), false);

  const failingInput = new FakeTtyInput();
  const failingOutput = {
    isTTY: true,
    write() {
      throw new Error("synthetic-output-failure");
    }
  };

  assert.equal(await selectExperimentalPet(catalog, {
    input: failingInput,
    output: failingOutput
  }), null);
  assert.deepEqual(failingInput.rawModes, [true, false]);
  assert.equal(failingInput.listenerCount("keypress"), 0);
});

class FakeTtyInput extends PassThrough {
  constructor(options = {}) {
    super();
    this.isTTY = options.isTTY ?? true;
    this.isRaw = false;
    this.rawModes = [];
  }

  setRawMode(value) {
    this.isRaw = value;
    this.rawModes.push(value);
    return this;
  }
}

function createOutput() {
  return {
    isTTY: true,
    value: "",
    write(chunk) {
      this.value += chunk;
    }
  };
}
