import { createHash } from "node:crypto";
import {
  lstat,
  open,
  readdir,
  realpath
} from "node:fs/promises";
import { homedir } from "node:os";
import {
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep
} from "node:path";

export const EXPERIMENTAL_PET_STATUSES = Object.freeze([
  "ok",
  "unavailable"
]);

export const EXPERIMENTAL_PET_REASONS = Object.freeze([
  "selected_pet_state_unavailable",
  "selected_pet_not_custom",
  "selected_pet_selection_unavailable",
  "selected_pet_manifest_unavailable",
  "selected_pet_image_unavailable",
  "selected_pet_image_invalid",
  "selected_pet_image_too_large"
]);

export const EXPERIMENTAL_PET_IMAGE_CONTENT_TYPES = Object.freeze([
  "image/webp",
  "image/png"
]);

export const EXPERIMENTAL_PET_CATALOG_FIELDS = Object.freeze([
  "key",
  "displayName",
  "selected"
]);

export const MAX_EXPERIMENTAL_PET_STATE_BYTES = 1_048_576;
export const MAX_EXPERIMENTAL_PET_MANIFEST_BYTES = 65_536;
export const MAX_EXPERIMENTAL_PET_IMAGE_BYTES = 8_388_608;
export const MAX_EXPERIMENTAL_PET_IMAGE_DIMENSION = 8_192;
export const MAX_EXPERIMENTAL_PET_IMAGE_PIXELS = 16_777_216;

const STATE_FILE_NAME = ".codex-global-state.json";
const PERSISTED_ATOM_KEY = "electron-persisted-atom-state";
const SELECTED_AVATAR_KEY = "selected-avatar-id";
const CUSTOM_AVATAR_PREFIX = "custom:";
const PETS_DIRECTORY_NAME = "pets";
const PET_MANIFEST_NAME = "pet.json";
const MAX_SELECTED_ID_LENGTH = 256;
const MAX_DISPLAY_NAME_LENGTH = 128;
const MAX_SPRITESHEET_PATH_LENGTH = 1_024;
const PROTOTYPE_SENSITIVE_KEYS = Object.freeze([
  "__proto__",
  "constructor",
  "prototype"
]);
const CONTENT_TYPE_BY_EXTENSION = Object.freeze({
  ".png": "image/png",
  ".webp": "image/webp"
});

export async function readExperimentalPet(options = {}) {
  const codexHome = resolveCodexHome(options);
  let manifestResult;

  if (Object.hasOwn(options, "petKey")) {
    if (!isPositiveSafeInteger(options.petKey)) {
      return unavailablePet("selected_pet_selection_unavailable");
    }

    const catalog = await readPetCatalog(codexHome, null);
    const selectedEntry = catalog.find((entry) => entry.key === options.petKey);
    if (selectedEntry === undefined) {
      return unavailablePet("selected_pet_selection_unavailable");
    }

    manifestResult = selectedEntry.manifest;
  } else {
    const selected = await readSelectedCustomPet(codexHome);

    if (selected.reason !== null) {
      return unavailablePet(selected.reason);
    }

    manifestResult = await readSelectedManifest(
      codexHome,
      selected.customId
    );
    selected.customId = null;

    if (manifestResult.reason !== null) {
      return unavailablePet(manifestResult.reason);
    }
  }

  const imageResult = await readPetImage(manifestResult);
  manifestResult.petDirectory = null;
  manifestResult.spritesheetPath = null;

  if (imageResult.reason !== null) {
    return unavailablePet(imageResult.reason);
  }

  return {
    status: "ok",
    reason: null,
    kind: "custom",
    image: imageResult.image
  };
}

export async function listExperimentalPets(options = {}) {
  const codexHome = resolveCodexHome(options);
  const selected = await readSelectedCustomPet(codexHome);
  const selectedCustomId = selected.reason === null ? selected.customId : null;
  const catalog = await readPetCatalog(codexHome, selectedCustomId);
  selected.customId = null;

  return catalog.map((entry) => ({
    key: entry.key,
    displayName: entry.displayName,
    selected: entry.selected
  }));
}

function resolveCodexHome(options) {
  if (typeof options.codexHome === "string"
    && options.codexHome.trim().length > 0) {
    return resolve(options.codexHome);
  }

  const env = isRecord(options.env) ? options.env : process.env;
  if (typeof env.CODEX_HOME === "string"
    && env.CODEX_HOME.trim().length > 0) {
    return resolve(env.CODEX_HOME);
  }

  const homeDir = typeof options.homeDir === "string"
    && options.homeDir.trim().length > 0
    ? options.homeDir
    : homedir();
  return resolve(homeDir, ".codex");
}

async function readSelectedCustomPet(codexHome) {
  const result = await readLimitedJson(
    join(codexHome, STATE_FILE_NAME),
    MAX_EXPERIMENTAL_PET_STATE_BYTES
  );

  if (!result.ok || !isRecord(result.value)) {
    return selectedFailure("selected_pet_state_unavailable");
  }

  const persistedState = result.value[PERSISTED_ATOM_KEY];
  if (!isRecord(persistedState)
    || hasPrototypeSensitiveKey(persistedState)) {
    return selectedFailure("selected_pet_state_unavailable");
  }

  const selectedAvatarId = persistedState[SELECTED_AVATAR_KEY];
  if (typeof selectedAvatarId !== "string"
    || selectedAvatarId.length < 1
    || selectedAvatarId.length > MAX_SELECTED_ID_LENGTH
    || selectedAvatarId.trim() !== selectedAvatarId
    || hasControlCharacter(selectedAvatarId)) {
    return selectedFailure("selected_pet_state_unavailable");
  }

  if (!selectedAvatarId.startsWith(CUSTOM_AVATAR_PREFIX)) {
    return selectedFailure("selected_pet_not_custom");
  }

  const customId = selectedAvatarId.slice(CUSTOM_AVATAR_PREFIX.length);
  if (customId.length < 1 || hasControlCharacter(customId)) {
    return selectedFailure("selected_pet_state_unavailable");
  }

  return {
    reason: null,
    customId
  };
}

async function readSelectedManifest(codexHome, customId) {
  const petsDirectory = join(codexHome, PETS_DIRECTORY_NAME);
  let entries;

  try {
    entries = await readdir(petsDirectory, { withFileTypes: true });
  } catch {
    return manifestFailure();
  }

  const selectedEntry = entries.find((entry) => (
    entry.isDirectory() && entry.name === customId
  ));
  if (selectedEntry === undefined) {
    return manifestFailure();
  }

  const petDirectory = join(petsDirectory, selectedEntry.name);
  const manifest = await readCatalogManifest(petDirectory);
  return manifest ?? manifestFailure();
}

async function readPetCatalog(codexHome, selectedCustomId) {
  const petsDirectory = join(codexHome, PETS_DIRECTORY_NAME);
  let entries;

  try {
    entries = await readdir(petsDirectory, { withFileTypes: true });
  } catch {
    return [];
  }

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .sort(compareDirectoryEntries);
  const catalog = [];

  for (const entry of directories) {
    const manifest = await readCatalogManifest(
      join(petsDirectory, entry.name)
    );
    if (manifest === null) continue;

    catalog.push({
      key: catalog.length + 1,
      displayName: manifest.displayName,
      selected: selectedCustomId !== null && entry.name === selectedCustomId,
      manifest
    });
  }

  return catalog;
}

async function readCatalogManifest(petDirectory) {
  const manifestResult = await readLimitedJson(
    join(petDirectory, PET_MANIFEST_NAME),
    MAX_EXPERIMENTAL_PET_MANIFEST_BYTES
  );

  if (!manifestResult.ok
    || !isRecord(manifestResult.value)
    || hasPrototypeSensitiveKey(manifestResult.value)) {
    return null;
  }

  const spritesheetPath = normalizeRelativeImagePath(
    manifestResult.value.spritesheetPath
  );
  if (spritesheetPath === null) {
    return null;
  }

  return {
    reason: null,
    petDirectory,
    spritesheetPath,
    displayName: normalizeDisplayName(manifestResult.value.displayName)
  };
}

async function readPetImage(manifestResult) {
  const extension = extname(manifestResult.spritesheetPath).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXTENSION[extension];
  if (contentType === undefined) {
    return imageFailure("selected_pet_image_invalid");
  }

  const imagePath = join(
    manifestResult.petDirectory,
    manifestResult.spritesheetPath
  );
  const containedPath = await resolveContainedFile(
    manifestResult.petDirectory,
    imagePath
  );
  if (containedPath === null) {
    return imageFailure("selected_pet_image_unavailable");
  }

  const readResult = await readBoundedFile(
    containedPath,
    MAX_EXPERIMENTAL_PET_IMAGE_BYTES
  );
  if (!readResult.ok) {
    return imageFailure(readResult.tooLarge
      ? "selected_pet_image_too_large"
      : "selected_pet_image_unavailable");
  }

  const dimensions = contentType === "image/png"
    ? readPngDimensions(readResult.bytes)
    : readWebpDimensions(readResult.bytes);
  if (!isAllowedDimensions(dimensions)) {
    return imageFailure("selected_pet_image_invalid");
  }

  return {
    reason: null,
    image: {
      role: "spritesheet",
      contentType,
      width: dimensions.width,
      height: dimensions.height,
      byteLength: readResult.bytes.byteLength,
      sha256: createHash("sha256").update(readResult.bytes).digest("hex"),
      base64: readResult.bytes.toString("base64")
    }
  };
}

async function readLimitedJson(filePath, maximumBytes) {
  const result = await readBoundedFile(filePath, maximumBytes);
  if (!result.ok) return { ok: false, value: null };

  try {
    const text = new TextDecoder("utf-8", { fatal: true })
      .decode(result.bytes);
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
}

async function readBoundedFile(filePath, maximumBytes) {
  let handle;

  try {
    const metadata = await lstat(filePath);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      return { ok: false, tooLarge: false, bytes: null };
    }
    if (!Number.isSafeInteger(metadata.size) || metadata.size > maximumBytes) {
      return { ok: false, tooLarge: true, bytes: null };
    }

    handle = await open(filePath, "r");
    const openedMetadata = await handle.stat();
    if (!openedMetadata.isFile()
      || !Number.isSafeInteger(openedMetadata.size)
      || openedMetadata.size !== metadata.size
      || openedMetadata.size > maximumBytes) {
      return {
        ok: false,
        tooLarge: openedMetadata.size > maximumBytes,
        bytes: null
      };
    }

    const buffer = Buffer.alloc(openedMetadata.size + 1);
    let offset = 0;
    while (offset < buffer.byteLength) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.byteLength - offset,
        offset
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }

    const finalMetadata = await handle.stat();
    if (offset !== openedMetadata.size
      || finalMetadata.size !== openedMetadata.size) {
      return {
        ok: false,
        tooLarge: offset > maximumBytes || finalMetadata.size > maximumBytes,
        bytes: null
      };
    }

    return {
      ok: true,
      tooLarge: false,
      bytes: buffer.subarray(0, offset)
    };
  } catch {
    return { ok: false, tooLarge: false, bytes: null };
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function resolveContainedFile(baseDirectory, candidatePath) {
  try {
    const candidateMetadata = await lstat(candidatePath);
    if (!candidateMetadata.isFile() || candidateMetadata.isSymbolicLink()) {
      return null;
    }

    const [baseRealPath, candidateRealPath] = await Promise.all([
      realpath(baseDirectory),
      realpath(candidatePath)
    ]);
    const relativePath = relative(baseRealPath, candidateRealPath);
    if (relativePath.length === 0
      || relativePath === ".."
      || relativePath.startsWith(`..${sep}`)
      || isAbsolute(relativePath)) {
      return null;
    }

    return candidateRealPath;
  } catch {
    return null;
  }
}

function normalizeRelativeImagePath(value) {
  if (typeof value !== "string"
    || value.length < 1
    || value.length > MAX_SPRITESHEET_PATH_LENGTH
    || value.trim() !== value
    || hasControlCharacter(value)
    || isAbsolute(value)) {
    return null;
  }

  const normalizedPath = normalize(value);
  if (normalizedPath === "."
    || normalizedPath === ".."
    || normalizedPath.startsWith(`..${sep}`)) {
    return null;
  }

  return normalizedPath;
}

function normalizeDisplayName(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed.length < 1
    || trimmed.length > MAX_DISPLAY_NAME_LENGTH
    || hasControlCharacter(trimmed)) {
    return null;
  }

  return trimmed;
}

function compareDirectoryEntries(left, right) {
  if (left.name < right.name) return -1;
  if (left.name > right.name) return 1;
  return 0;
}

function readPngDimensions(bytes) {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
  ]);
  if (bytes.byteLength < 33
    || !bytes.subarray(0, signature.byteLength).equals(signature)
    || bytes.readUInt32BE(8) !== 13
    || bytes.toString("ascii", 12, 16) !== "IHDR") {
    return null;
  }

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

function readWebpDimensions(bytes) {
  if (bytes.byteLength < 20
    || bytes.toString("ascii", 0, 4) !== "RIFF"
    || bytes.toString("ascii", 8, 12) !== "WEBP"
    || bytes.readUInt32LE(4) + 8 !== bytes.byteLength) {
    return null;
  }

  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const chunkType = bytes.toString("ascii", offset, offset + 4);
    const chunkLength = bytes.readUInt32LE(offset + 4);
    const payloadOffset = offset + 8;
    const payloadEnd = payloadOffset + chunkLength;
    if (payloadEnd > bytes.byteLength) return null;

    if (chunkType === "VP8X") {
      if (chunkLength < 10) return null;
      return {
        width: 1 + readUInt24LE(bytes, payloadOffset + 4),
        height: 1 + readUInt24LE(bytes, payloadOffset + 7)
      };
    }

    if (chunkType === "VP8L") {
      if (chunkLength < 5 || bytes[payloadOffset] !== 0x2f) return null;
      const bits = bytes.readUInt32LE(payloadOffset + 1);
      return {
        width: 1 + (bits & 0x3fff),
        height: 1 + ((bits >>> 14) & 0x3fff)
      };
    }

    if (chunkType === "VP8 ") {
      if (chunkLength < 10
        || bytes[payloadOffset + 3] !== 0x9d
        || bytes[payloadOffset + 4] !== 0x01
        || bytes[payloadOffset + 5] !== 0x2a) {
        return null;
      }
      return {
        width: bytes.readUInt16LE(payloadOffset + 6) & 0x3fff,
        height: bytes.readUInt16LE(payloadOffset + 8) & 0x3fff
      };
    }

    offset = payloadEnd + (chunkLength % 2);
  }

  return null;
}

function readUInt24LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function isAllowedDimensions(value) {
  return value !== null
    && Number.isInteger(value.width)
    && Number.isInteger(value.height)
    && value.width >= 1
    && value.height >= 1
    && value.width <= MAX_EXPERIMENTAL_PET_IMAGE_DIMENSION
    && value.height <= MAX_EXPERIMENTAL_PET_IMAGE_DIMENSION
    && value.width * value.height <= MAX_EXPERIMENTAL_PET_IMAGE_PIXELS;
}

function hasPrototypeSensitiveKey(value) {
  return PROTOTYPE_SENSITIVE_KEYS.some((key) => Object.hasOwn(value, key));
}

function hasControlCharacter(value) {
  return /[\u0000-\u001f\u007f]/u.test(value);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value >= 1;
}

function selectedFailure(reason) {
  return { reason, customId: null };
}

function manifestFailure() {
  return {
    reason: "selected_pet_manifest_unavailable",
    petDirectory: null,
    spritesheetPath: null
  };
}

function imageFailure(reason) {
  return { reason, image: null };
}

function unavailablePet(reason) {
  return {
    status: "unavailable",
    reason,
    kind: null,
    image: null
  };
}
