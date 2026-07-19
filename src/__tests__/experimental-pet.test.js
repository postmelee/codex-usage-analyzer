import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  truncate,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  EXPERIMENTAL_PET_CATALOG_FIELDS,
  EXPERIMENTAL_PET_IMAGE_CONTENT_TYPES,
  EXPERIMENTAL_PET_REASONS,
  EXPERIMENTAL_PET_STATUSES,
  MAX_EXPERIMENTAL_PET_IMAGE_BYTES,
  MAX_EXPERIMENTAL_PET_IMAGE_DIMENSION,
  MAX_EXPERIMENTAL_PET_IMAGE_PIXELS,
  MAX_EXPERIMENTAL_PET_MANIFEST_BYTES,
  MAX_EXPERIMENTAL_PET_STATE_BYTES,
  listExperimentalPets,
  readExperimentalPet
} from "../experimental-pet.js";

const scenario = JSON.parse(await readFile(
  new URL("./fixtures/experimental-pet/selected-custom.json", import.meta.url),
  "utf8"
));

test("reads one selected custom WebP spritesheet with bounded metadata", async (t) => {
  const image = createWebpVp8x(1_024, 1_152);
  const fixture = await createCodexHome(t, { image });
  const result = await readExperimentalPet({ codexHome: fixture.root });

  assert.deepEqual(Object.keys(result), [
    "status",
    "reason",
    "kind",
    "image"
  ]);
  assert.equal(result.status, "ok");
  assert.equal(result.reason, null);
  assert.equal(result.kind, "custom");
  assert.deepEqual(Object.keys(result.image), [
    "role",
    "contentType",
    "width",
    "height",
    "byteLength",
    "sha256",
    "base64"
  ]);
  assert.deepEqual(result.image, {
    role: "spritesheet",
    contentType: "image/webp",
    width: 1_024,
    height: 1_152,
    byteLength: image.byteLength,
    sha256: createHash("sha256").update(image).digest("hex"),
    base64: image.toString("base64")
  });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(scenario.directoryName), false);
  assert.equal(serialized.includes(fixture.root), false);
  assert.equal(serialized.includes("file:"), false);
  assert.equal(serialized.includes("data:image"), false);
});

test("lists multiple custom pets without exposing source identifiers", async (t) => {
  const fixture = await createCodexHome(t, { image: false });
  await addPet(fixture.root, {
    directoryName: "alpha-synthetic-source-id",
    displayName: "  Alpha Pet  ",
    image: false
  });
  await addPet(fixture.root, {
    directoryName: "beta-synthetic-source-id",
    displayName: "Alpha Pet",
    image: false
  });
  await addPet(fixture.root, {
    directoryName: "zeta-synthetic-source-id",
    displayName: "synthetic\ninvalid",
    image: false
  });
  await addPet(fixture.root, {
    directoryName: "broken-synthetic-source-id",
    manifestContent: "{",
    image: false
  });
  const oversizedDirectory = await addPet(fixture.root, {
    directoryName: "gamma-synthetic-source-id",
    image: false
  });
  await truncate(
    join(oversizedDirectory, "pet.json"),
    MAX_EXPERIMENTAL_PET_MANIFEST_BYTES + 1
  );

  const catalog = await listExperimentalPets({ codexHome: fixture.root });

  assert.deepEqual(catalog, [
    { key: 1, displayName: "Alpha Pet", selected: false },
    { key: 2, displayName: "Alpha Pet", selected: false },
    { key: 3, displayName: "Synthetic Pet", selected: true },
    { key: 4, displayName: null, selected: false }
  ]);
  for (const item of catalog) {
    assert.deepEqual(Object.keys(item), EXPERIMENTAL_PET_CATALOG_FIELDS);
  }

  const serialized = JSON.stringify(catalog);
  assert.equal(serialized.includes("synthetic-source-id"), false);
  assert.equal(serialized.includes(scenario.directoryName), false);
  assert.equal(serialized.includes(fixture.root), false);
  assert.equal(serialized.includes("spritesheet"), false);
});

test("uses an explicit catalog key before Desktop selection", async (t) => {
  const fixture = await createCodexHome(t, {
    image: createWebpVp8x(64, 72)
  });
  await addPet(fixture.root, {
    directoryName: "alpha-synthetic-source-id",
    displayName: "Alpha Pet",
    image: createWebpVp8x(320, 288)
  });
  const catalog = await listExperimentalPets({ codexHome: fixture.root });
  const explicit = catalog.find((item) => item.displayName === "Alpha Pet");

  assert.equal(explicit.selected, false);
  const selectedResult = await readExperimentalPet({
    codexHome: fixture.root
  });
  const explicitResult = await readExperimentalPet({
    codexHome: fixture.root,
    petKey: explicit.key
  });

  assert.equal(selectedResult.status, "ok");
  assert.equal(selectedResult.image.width, 64);
  assert.equal(explicitResult.status, "ok");
  assert.equal(explicitResult.image.width, 320);
  assert.equal(explicitResult.image.height, 288);

  for (const petKey of [0, -1, 1.5, "1", 99, undefined]) {
    assert.deepEqual(
      await readExperimentalPet({ codexHome: fixture.root, petKey }),
      unavailable("selected_pet_selection_unavailable")
    );
  }
});

test("does not implicitly select the only installed custom pet", async (t) => {
  const fixture = await createCodexHome(t, { state: false });
  const catalog = await listExperimentalPets({ codexHome: fixture.root });

  assert.deepEqual(catalog, [
    { key: 1, displayName: "Synthetic Pet", selected: false }
  ]);
  assert.deepEqual(
    await readExperimentalPet({ codexHome: fixture.root }),
    unavailable("selected_pet_state_unavailable")
  );
  assert.equal((await readExperimentalPet({
    codexHome: fixture.root,
    petKey: catalog[0].key
  })).status, "ok");
});

test("supports PNG and the three bounded WebP dimension variants", async (t) => {
  const cases = [
    ["spritesheet.png", createPng(64, 72), "image/png", 64, 72],
    ["spritesheet.webp", createWebpVp8x(320, 288), "image/webp", 320, 288],
    ["spritesheet.webp", createWebpVp8l(321, 289), "image/webp", 321, 289],
    ["spritesheet.webp", createWebpVp8(322, 290), "image/webp", 322, 290]
  ];

  for (const [imageName, image, contentType, width, height] of cases) {
    const fixture = await createCodexHome(t, { image, imageName });
    const result = await readExperimentalPet({ codexHome: fixture.root });
    assert.equal(result.status, "ok");
    assert.equal(result.image.contentType, contentType);
    assert.equal(result.image.width, width);
    assert.equal(result.image.height, height);
  }
});

test("uses injected root, CODEX_HOME, then the home directory fallback", async (t) => {
  const injected = await createCodexHome(t);
  const fromEnvironment = await createCodexHome(t);
  const fallbackHome = await createHomeDirectory(t);

  assert.equal((await readExperimentalPet({
    codexHome: injected.root,
    env: { CODEX_HOME: fromEnvironment.root },
    homeDir: fallbackHome.homeDir
  })).status, "ok");
  assert.equal((await readExperimentalPet({
    env: { CODEX_HOME: fromEnvironment.root },
    homeDir: fallbackHome.homeDir
  })).status, "ok");
  assert.equal((await readExperimentalPet({
    env: {},
    homeDir: fallbackHome.homeDir
  })).status, "ok");
});

test("returns safe state reasons without selecting an installed fallback", async (t) => {
  const missingState = await createCodexHome(t, { state: false });
  const builtIn = await createCodexHome(t, { selectedAvatarId: "codex" });
  const malformed = await createCodexHome(t, { stateContent: "{" });
  const wrongShape = await createCodexHome(t, {
    stateValue: { "electron-persisted-atom-state": [] }
  });
  const oversized = await createCodexHome(t);
  await truncate(
    join(oversized.root, ".codex-global-state.json"),
    MAX_EXPERIMENTAL_PET_STATE_BYTES + 1
  );

  for (const fixture of [missingState, malformed, wrongShape, oversized]) {
    assert.deepEqual(
      await readExperimentalPet({ codexHome: fixture.root }),
      unavailable("selected_pet_state_unavailable")
    );
  }
  assert.deepEqual(
    await readExperimentalPet({ codexHome: builtIn.root }),
    unavailable("selected_pet_not_custom")
  );
});

test("rejects missing, mismatched, malformed, and oversized manifests", async (t) => {
  const missingDirectory = await createCodexHome(t, { petDirectory: false });
  const mismatchedDirectory = await createCodexHome(t, {
    directoryName: "different-synthetic-pet"
  });
  const missingManifest = await createCodexHome(t, { manifest: false });
  const malformedManifest = await createCodexHome(t, { manifestContent: "{" });
  const wrongShape = await createCodexHome(t, { manifestValue: [] });
  const prototypeKey = await createCodexHome(t, {
    manifestContent: "{\"__proto__\":{},\"spritesheetPath\":\"spritesheet.webp\"}"
  });
  const oversizedManifest = await createCodexHome(t);
  await truncate(
    join(oversizedManifest.petDirectory, "pet.json"),
    MAX_EXPERIMENTAL_PET_MANIFEST_BYTES + 1
  );

  for (const fixture of [
    missingDirectory,
    mismatchedDirectory,
    missingManifest,
    malformedManifest,
    wrongShape,
    prototypeKey,
    oversizedManifest
  ]) {
    assert.deepEqual(
      await readExperimentalPet({ codexHome: fixture.root }),
      unavailable("selected_pet_manifest_unavailable")
    );
  }
});

test("rejects path traversal and symbolic-link image escape", async (t) => {
  const traversal = await createCodexHome(t, {
    spritesheetPath: "../outside.webp",
    image: false
  });
  await writeFile(
    join(dirname(traversal.petDirectory), "outside.webp"),
    createWebpVp8x(32, 32)
  );
  assert.deepEqual(
    await readExperimentalPet({ codexHome: traversal.root }),
    unavailable("selected_pet_manifest_unavailable")
  );

  const linked = await createCodexHome(t, { image: false });
  const outsidePath = join(linked.root, "outside.webp");
  await writeFile(outsidePath, createWebpVp8x(32, 32));
  try {
    await symlink(outsidePath, join(linked.petDirectory, "spritesheet.webp"));
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "EACCES") {
      t.diagnostic("symlink creation unavailable; traversal assertion passed");
      return;
    }
    throw error;
  }
  assert.deepEqual(
    await readExperimentalPet({ codexHome: linked.root }),
    unavailable("selected_pet_image_unavailable")
  );
});

test("rejects missing, oversized, unsupported, and mismatched images", async (t) => {
  const missing = await createCodexHome(t, { image: false });
  const oversized = await createCodexHome(t);
  await truncate(
    join(oversized.petDirectory, "spritesheet.webp"),
    MAX_EXPERIMENTAL_PET_IMAGE_BYTES + 1
  );
  const unsupported = await createCodexHome(t, {
    imageName: "spritesheet.gif",
    image: createWebpVp8x(32, 32)
  });
  const mismatched = await createCodexHome(t, {
    imageName: "spritesheet.png",
    image: createWebpVp8x(32, 32)
  });

  assert.deepEqual(
    await readExperimentalPet({ codexHome: missing.root }),
    unavailable("selected_pet_image_unavailable")
  );
  assert.deepEqual(
    await readExperimentalPet({ codexHome: oversized.root }),
    unavailable("selected_pet_image_too_large")
  );
  for (const fixture of [unsupported, mismatched]) {
    assert.deepEqual(
      await readExperimentalPet({ codexHome: fixture.root }),
      unavailable("selected_pet_image_invalid")
    );
  }
});

test("rejects malformed and excessive image dimensions", async (t) => {
  const malformed = await createCodexHome(t, { image: Buffer.from("not-webp") });
  const wide = await createCodexHome(t, {
    image: createWebpVp8x(MAX_EXPERIMENTAL_PET_IMAGE_DIMENSION + 1, 1)
  });
  const excessivePixels = await createCodexHome(t, {
    image: createWebpVp8x(4_097, 4_097)
  });
  assert.ok(4_097 * 4_097 > MAX_EXPERIMENTAL_PET_IMAGE_PIXELS);

  for (const fixture of [malformed, wide, excessivePixels]) {
    assert.deepEqual(
      await readExperimentalPet({ codexHome: fixture.root }),
      unavailable("selected_pet_image_invalid")
    );
  }
});

test("exports fixed enum and limit contracts", () => {
  assert.deepEqual(EXPERIMENTAL_PET_STATUSES, ["ok", "unavailable"]);
  assert.deepEqual(EXPERIMENTAL_PET_REASONS, [
    "selected_pet_state_unavailable",
    "selected_pet_not_custom",
    "selected_pet_selection_unavailable",
    "selected_pet_manifest_unavailable",
    "selected_pet_image_unavailable",
    "selected_pet_image_invalid",
    "selected_pet_image_too_large"
  ]);
  assert.deepEqual(EXPERIMENTAL_PET_IMAGE_CONTENT_TYPES, [
    "image/webp",
    "image/png"
  ]);
  assert.deepEqual(EXPERIMENTAL_PET_CATALOG_FIELDS, [
    "key",
    "displayName",
    "selected"
  ]);
  assert.equal(MAX_EXPERIMENTAL_PET_STATE_BYTES, 1_048_576);
  assert.equal(MAX_EXPERIMENTAL_PET_MANIFEST_BYTES, 65_536);
  assert.equal(MAX_EXPERIMENTAL_PET_IMAGE_BYTES, 8_388_608);
  assert.equal(MAX_EXPERIMENTAL_PET_IMAGE_DIMENSION, 8_192);
  assert.equal(MAX_EXPERIMENTAL_PET_IMAGE_PIXELS, 16_777_216);
});

async function createHomeDirectory(t) {
  const homeDir = await temporaryDirectory(t);
  const root = join(homeDir, ".codex");
  await createCodexHome(t, { root });
  return { homeDir, root };
}

async function createCodexHome(t, options = {}) {
  const root = options.root ?? await temporaryDirectory(t);
  await mkdir(root, { recursive: true });

  if (options.state !== false) {
    const selectedAvatarId = options.selectedAvatarId
      ?? scenario.selectedAvatarId;
    const stateValue = options.stateValue ?? {
      "electron-persisted-atom-state": {
        "selected-avatar-id": selectedAvatarId
      }
    };
    const stateContent = options.stateContent ?? JSON.stringify(stateValue);
    await writeFile(join(root, ".codex-global-state.json"), stateContent);
  }

  const petDirectory = await addPet(root, options);

  return { root, petDirectory };
}

async function addPet(root, options = {}) {
  const directoryName = options.directoryName ?? scenario.directoryName;
  const petDirectory = join(root, "pets", directoryName);
  if (options.petDirectory === false) return petDirectory;

  await mkdir(petDirectory, { recursive: true });
  const imageName = options.imageName ?? "spritesheet.webp";
  const spritesheetPath = options.spritesheetPath ?? imageName;
  if (options.manifest !== false) {
    const manifestValue = options.manifestValue ?? {
      ...scenario.manifest,
      displayName: options.displayName ?? scenario.manifest.displayName,
      spritesheetPath
    };
    const manifestContent = options.manifestContent
      ?? JSON.stringify(manifestValue);
    await writeFile(join(petDirectory, "pet.json"), manifestContent);
  }

  if (options.image !== false) {
    const image = options.image ?? createWebpVp8x(64, 72);
    const imagePath = join(petDirectory, imageName);
    await mkdir(dirname(imagePath), { recursive: true });
    await writeFile(imagePath, image);
  }

  return petDirectory;
}

async function temporaryDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), "codex-pet-test-"));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

function unavailable(reason) {
  return {
    status: "unavailable",
    reason,
    kind: null,
    image: null
  };
}

function createPng(width, height) {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    .copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
}

function createWebpVp8x(width, height) {
  const payload = Buffer.alloc(10);
  writeUInt24LE(payload, width - 1, 4);
  writeUInt24LE(payload, height - 1, 7);
  return wrapWebpChunk("VP8X", payload);
}

function createWebpVp8l(width, height) {
  const payload = Buffer.alloc(5);
  payload[0] = 0x2f;
  const bits = ((width - 1) | ((height - 1) << 14)) >>> 0;
  payload.writeUInt32LE(bits, 1);
  return wrapWebpChunk("VP8L", payload);
}

function createWebpVp8(width, height) {
  const payload = Buffer.alloc(10);
  payload[3] = 0x9d;
  payload[4] = 0x01;
  payload[5] = 0x2a;
  payload.writeUInt16LE(width, 6);
  payload.writeUInt16LE(height, 8);
  return wrapWebpChunk("VP8 ", payload);
}

function wrapWebpChunk(type, payload) {
  const padding = payload.byteLength % 2;
  const bytes = Buffer.alloc(20 + payload.byteLength + padding);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(bytes.byteLength - 8, 4);
  bytes.write("WEBP", 8, "ascii");
  bytes.write(type, 12, "ascii");
  bytes.writeUInt32LE(payload.byteLength, 16);
  payload.copy(bytes, 20);
  return bytes;
}

function writeUInt24LE(bytes, value, offset) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
}
