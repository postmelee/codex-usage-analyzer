import { constants } from "node:fs";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { extname, isAbsolute, join, normalize } from "node:path";

import { resolveCodexHome } from "./codex-home.js";

export const BUILT_IN_CODEX_PETS = Object.freeze([
  { id: "codex", displayName: "Codex" },
  { id: "dewey", displayName: "Dewey" },
  { id: "fireball", displayName: "Fireball" },
  { id: "hoots", displayName: "Hoots" },
  { id: "rocky", displayName: "Rocky" },
  { id: "seedy", displayName: "Seedy" },
  { id: "stacky", displayName: "Stacky" },
  { id: "bsod", displayName: "BSOD" },
  { id: "null-signal", displayName: "Null Signal" }
]);

const DEFAULT_BUILT_IN_PET_ID = "codex";
const CUSTOM_AVATAR_PREFIX = "custom:";
const STATE_FILE_NAME = ".codex-global-state.json";
const PERSISTED_ATOM_KEY = "electron-persisted-atom-state";
const SELECTED_AVATAR_KEY = "selected-avatar-id";
const CUSTOM_PET_MANIFESTS = ["pet.json", "avatar.json"];
const GENERATED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const CONTENT_TYPES_BY_EXTENSION = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);

export async function aggregateCodexAssetsFromCodexHome(options = {}) {
  const { codexHome, source } = resolveCodexHome(options);
  const [customPets, selectedAvatar, generatedImages] = await Promise.all([
    discoverCustomPets(codexHome),
    readSelectedAvatarId(codexHome),
    countExcludedGeneratedImages(codexHome)
  ]);
  const selectedPet = resolveSelectedPet(selectedAvatar.value, customPets.items);
  const petAsset = createPetAsset(selectedPet);
  const codexAssets = {
    avatar: null,
    pet: petAsset
  };

  return {
    codexAssets,
    diagnostics: {
      status: "ok",
      reason: null,
      source,
      basis: "codex_desktop_pet_catalog_best_effort",
      avatar: {
        status: "unavailable",
        reason: "avatar_source_not_owned"
      },
      pet: {
        status: "ok",
        reason: selectedPet.reason,
        kind: selectedPet.kind,
        selectedSource: selectedAvatar.source,
        selectedId: selectedPet.kind === "builtin" ? selectedPet.id : null,
        selectedIdRedacted: selectedPet.kind === "custom",
        assetRef: petAsset.assetRef,
        contentType: petAsset.contentType
      },
      selectedAvatar: {
        status: selectedAvatar.status,
        reason: selectedAvatar.reason,
        source: selectedAvatar.source
      },
      builtInPetCount: BUILT_IN_CODEX_PETS.length,
      customPetCount: customPets.items.length,
      customPetDiagnostics: customPets.diagnostics,
      excludedCandidateCount: generatedImages.count,
      excludedSources: generatedImages.count > 0 ? ["generated_images"] : []
    }
  };
}

async function readSelectedAvatarId(codexHome) {
  let content;
  try {
    content = await readFile(join(codexHome, STATE_FILE_NAME), "utf8");
  } catch {
    return {
      status: "unavailable",
      reason: "selected_avatar_state_not_found",
      source: "default",
      value: null
    };
  }

  let state;
  try {
    state = JSON.parse(content);
  } catch {
    return {
      status: "unavailable",
      reason: "selected_avatar_state_unreadable",
      source: "default",
      value: null
    };
  }

  const persistedState = isRecord(state[PERSISTED_ATOM_KEY])
    ? state[PERSISTED_ATOM_KEY]
    : state;
  const value = persistedState[SELECTED_AVATAR_KEY];

  if (typeof value === "string" && value.trim().length > 0) {
    return {
      status: "ok",
      reason: null,
      source: "persisted_atom",
      value: value.trim()
    };
  }

  return {
    status: "unavailable",
    reason: "selected_avatar_id_not_set",
    source: "default",
    value: null
  };
}

function resolveSelectedPet(selectedAvatarId, customPets) {
  if (typeof selectedAvatarId === "string") {
    if (isBuiltInPetId(selectedAvatarId)) {
      return {
        kind: "builtin",
        id: selectedAvatarId,
        reason: null,
        contentType: "image/webp"
      };
    }

    if (selectedAvatarId.startsWith(CUSTOM_AVATAR_PREFIX)) {
      const customId = selectedAvatarId.slice(CUSTOM_AVATAR_PREFIX.length);
      const customPet = customPets.find((pet) => pet.id === customId);
      if (customPet !== undefined) {
        return {
          kind: "custom",
          id: null,
          reason: null,
          contentType: customPet.contentType
        };
      }
    }

    return {
      kind: "builtin",
      id: DEFAULT_BUILT_IN_PET_ID,
      reason: "selected_avatar_not_found_fallback",
      contentType: "image/webp"
    };
  }

  return {
    kind: "builtin",
    id: DEFAULT_BUILT_IN_PET_ID,
    reason: "default_selected_avatar",
    contentType: "image/webp"
  };
}

function createPetAsset(selectedPet) {
  return {
    kind: "codex-asset",
    url: null,
    assetRef: selectedPet.kind === "builtin"
      ? `codex-built-in:pet:${selectedPet.id}`
      : "codex-local:pet:custom-selected",
    contentType: selectedPet.contentType
  };
}

async function discoverCustomPets(codexHome) {
  const petsDir = join(codexHome, "pets");
  const diagnostics = {
    status: "unavailable",
    reason: "custom_pet_directory_not_found",
    directoriesScanned: 0,
    manifestFilesRead: 0,
    validCustomPets: 0,
    invalidCustomPets: 0,
    nonDirectoryEntries: 0
  };

  let entries;
  try {
    entries = await readdir(petsDir, { withFileTypes: true });
  } catch {
    return {
      diagnostics,
      items: []
    };
  }

  diagnostics.status = "ok";
  diagnostics.reason = null;

  const items = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory()) {
      diagnostics.nonDirectoryEntries += 1;
      continue;
    }

    diagnostics.directoriesScanned += 1;
    const result = await readCustomPetDirectory(petsDir, entry.name);
    if (result === null) {
      diagnostics.invalidCustomPets += 1;
      continue;
    }

    diagnostics.manifestFilesRead += 1;
    diagnostics.validCustomPets += 1;
    items.push(result);
  }

  return {
    diagnostics,
    items
  };
}

async function readCustomPetDirectory(petsDir, entryName) {
  const petDir = join(petsDir, entryName);

  for (const manifestName of CUSTOM_PET_MANIFESTS) {
    const manifest = await readCustomPetManifest(join(petDir, manifestName));
    if (manifest === null) {
      continue;
    }

    const spritesheetPath = normalizeSpritesheetPath(manifest.spritesheetPath);
    if (spritesheetPath === null) {
      return null;
    }

    const contentType = inferContentType(spritesheetPath);
    if (contentType === null) {
      return null;
    }

    if (!await isReadableFile(join(petDir, spritesheetPath))) {
      return null;
    }

    return {
      id: entryName,
      contentType
    };
  }

  return null;
}

async function readCustomPetManifest(manifestPath) {
  let content;
  try {
    content = await readFile(manifestPath, "utf8");
  } catch {
    return null;
  }

  try {
    const manifest = JSON.parse(content);
    return isRecord(manifest) ? manifest : null;
  } catch {
    return null;
  }
}

function normalizeSpritesheetPath(value) {
  const path = typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : "spritesheet.webp";
  const normalized = normalize(path);

  if (
    isAbsolute(normalized)
    || normalized === "."
    || normalized.startsWith("..")
    || normalized.includes("/../")
    || normalized.includes("\\..\\")
  ) {
    return null;
  }

  return normalized;
}

async function countExcludedGeneratedImages(codexHome) {
  const generatedImagesDir = join(codexHome, "generated_images");

  if (!await isReadableDirectory(generatedImagesDir)) {
    return { count: 0 };
  }

  return {
    count: await countFilesByExtension(generatedImagesDir, GENERATED_IMAGE_EXTENSIONS)
  };
}

async function countFilesByExtension(directory, extensions) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return 0;
  }

  let count = 0;
  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      count += await countFilesByExtension(entryPath, extensions);
    } else if (entry.isFile() && extensions.has(extname(entry.name).toLowerCase())) {
      count += 1;
    }
  }

  return count;
}

async function isReadableFile(path) {
  try {
    const stats = await stat(path);
    if (!stats.isFile()) {
      return false;
    }

    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function isReadableDirectory(path) {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

function inferContentType(path) {
  return CONTENT_TYPES_BY_EXTENSION.get(extname(path).toLowerCase()) ?? null;
}

function isBuiltInPetId(value) {
  return BUILT_IN_CODEX_PETS.some((pet) => pet.id === value);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
