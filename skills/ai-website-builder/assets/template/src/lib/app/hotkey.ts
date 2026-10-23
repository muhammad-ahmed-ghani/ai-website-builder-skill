/**
 * Keyboard shortcut parsing, pure (no React, no DOM), so it can be tested on its own. useHotkey (hooks.ts) is the React side.
 * A combo is "+"-joined and case-insensitive: "mod+k", "mod+shift+p", "escape", "[", "?".
 * `mod` is Command on Apple platforms and Control elsewhere.
 */

export interface Combo {
  /** Lower-case `KeyboardEvent.key`: "k", "escape", "arrowdown", "?". */
  key: string;
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

const KEY_ALIASES: Record<string, string> = {
  esc: "escape",
  space: " ",
  spacebar: " ",
  return: "enter",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  del: "delete",
  plus: "+",
};

export function parseCombo(combo: string): Combo {
  const text = combo.trim().toLowerCase();
  const trailingPlus = text.endsWith("+") && text.length > 1;
  const tokens = (trailingPlus ? text.slice(0, -1) : text).split("+").map((t) => t.trim()).filter(Boolean);
  const out: Combo = { key: trailingPlus ? "+" : "", mod: false, ctrl: false, meta: false, alt: false, shift: false };
  for (const token of tokens) {
    if (token === "mod") out.mod = true;
    else if (token === "ctrl" || token === "control") out.ctrl = true;
    else if (token === "meta" || token === "cmd" || token === "command") out.meta = true;
    else if (token === "alt" || token === "option") out.alt = true;
    else if (token === "shift") out.shift = true;
    else out.key = KEY_ALIASES[token] ?? token;
  }
  if (out.key === "") out.key = text === "+" ? "+" : text;
  return out;
}

export function matchesCombo(
  combo: Combo,
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">,
  apple: boolean,
): boolean {
  if (event.key.toLowerCase() !== combo.key) return false;
  const wantMeta = combo.meta || (combo.mod && apple);
  const wantCtrl = combo.ctrl || (combo.mod && !apple);
  if (event.metaKey !== wantMeta || event.ctrlKey !== wantCtrl || event.altKey !== combo.alt) return false;
  // "?" needs Shift on most layouts: only letters, digits and named keys must match Shift exactly.
  const exactShift = combo.key.length > 1 || /[\p{L}\p{N}]/u.test(combo.key);
  return exactShift ? event.shiftKey === combo.shift : !combo.shift || event.shiftKey;
}

/** Command on Mac, iPhone and iPad; Control everywhere else. Always false on the server. */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform) || /iPhone|iPad|iPod/.test(nav.userAgent ?? "");
}

/** True for text inputs, textareas, selects and contenteditable elements. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}
