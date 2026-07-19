import { emitKeypressEvents } from "node:readline";

const MAX_SELECTOR_DISPLAY_NAME_LENGTH = 128;

export async function selectExperimentalPet(catalog, options = {}) {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stderr;
  const items = normalizeCatalog(catalog);

  if (items.length === 0
    || input?.isTTY !== true
    || output?.isTTY !== true
    || typeof input.setRawMode !== "function"
    || typeof input.on !== "function"
    || typeof input.off !== "function") {
    return null;
  }

  const initialIndex = items.findIndex((item) => item.selected);
  let cursor = initialIndex < 0 ? 0 : initialIndex;

  return new Promise((resolve) => {
    const previousRawMode = input.isRaw === true;
    const wasFlowing = input.readableFlowing === true;
    let active = true;
    let rendered = false;

    function cleanup() {
      if (!active) return;
      active = false;
      input.off("keypress", onKeypress);

      try {
        input.setRawMode(previousRawMode);
      } catch {
        // Terminal cleanup is best effort after selection has settled.
      }

      if (!wasFlowing && typeof input.pause === "function") input.pause();
      try {
        output.write("\x1b[?25h");
      } catch {
        // Output cleanup is best effort after selection has settled.
      }
    }

    function settle(value) {
      cleanup();
      try {
        output.write("\n");
      } catch {
        // The caller receives the selection even if the final newline fails.
      }
      resolve(value);
    }

    function render() {
      const lineCount = items.length + 2;
      if (rendered) output.write(`\x1b[${lineCount}A`);
      output.write("\r\x1b[2KSelect a custom Codex pet\n");
      for (let index = 0; index < items.length; index += 1) {
        const marker = index === cursor ? ">" : " ";
        output.write(
          `\r\x1b[2K${marker} [${items[index].key}] ${items[index].label}\n`
        );
      }
      output.write("\r\x1b[2KUse Up/Down and Enter; Esc cancels\n");
      rendered = true;
    }

    function onKeypress(_text, key = {}) {
      if (!active) return;

      if (key.name === "up") {
        cursor = (cursor - 1 + items.length) % items.length;
      } else if (key.name === "down") {
        cursor = (cursor + 1) % items.length;
      } else if (key.name === "return" || key.name === "enter") {
        settle(items[cursor].key);
        return;
      } else if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        settle(null);
        return;
      } else {
        return;
      }

      try {
        render();
      } catch {
        settle(null);
      }
    }

    try {
      input.setRawMode(true);
      emitKeypressEvents(input);
      input.on("keypress", onKeypress);
      if (typeof input.resume === "function") input.resume();
      output.write("\x1b[?25l");
      render();
    } catch {
      settle(null);
    }
  });
}

function normalizeCatalog(value) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)
      || !Number.isSafeInteger(item.key)
      || item.key < 1
      || typeof item.selected !== "boolean") {
      return [];
    }

    return [{
      key: item.key,
      selected: item.selected,
      label: normalizeDisplayName(item.displayName) ?? `Custom pet ${item.key}`
    }];
  });
}

function normalizeDisplayName(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 1
    || trimmed.length > MAX_SELECTOR_DISPLAY_NAME_LENGTH
    || /[\u0000-\u001f\u007f]/u.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
