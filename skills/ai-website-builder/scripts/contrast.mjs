#!/usr/bin/env node
/**
 * WCAG contrast checker for design tokens. No dependencies.
 *
 *   node contrast.mjs --fg "oklch(0.22 0.01 70)" --bg "#fafaf8"        one pair
 *   node contrast.mjs --tokens src/styles/tokens.css                   every pair a component uses, light and dark
 *
 * Colours: #rgb, #rrggbb, rgb(r g b), oklch(L C H) (L 0..1 or 0..100%, optional / alpha is ignored).
 * Text pairs must reach 4.5:1 (3:1 for large text, shown too). Exit code 1 when a text pair fails 4.5:1.
 * Fix a failing pair by changing lightness in tokens.css, never by lowering the bar.
 */
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const arg = (k) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};

function oklchToSrgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v))); // linear sRGB, clipped to gamut
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** A colour string to linear sRGB, or null. */
export function parseColor(input) {
  const s = String(input).trim().toLowerCase();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  if (m) {
    const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
    return [0, 2, 4].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  }
  m = /^rgb\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(s);
  if (m) return [m[1], m[2], m[3]].map((v) => toLinear(Number(v) / 255));
  m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/.exec(s);
  if (m) return oklchToSrgb(m[2] ? Number(m[1]) / 100 : Number(m[1]), Number(m[3]), Number(m[4]));
  return null;
}

const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export function ratio(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** `--color-name: value;` declarations of one CSS block. */
function declarations(block) {
  const out = {};
  for (const m of block.matchAll(/--color-([a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

/** The default (@theme) colours and the dark overrides, if any. */
function readTokens(css) {
  const theme = /@theme[^{]*\{([\s\S]*?)\n\}/.exec(css);
  const dark = /\[data-theme=["']dark["']\]\s*\{([\s\S]*?)\n\}/.exec(css);
  return { light: theme ? declarations(theme[1]) : declarations(css), dark: dark ? declarations(dark[1]) : null };
}

/** The pairs components use: text on grounds, button text on its fill. */
const TEXT_PAIRS = [
  ["fg", "bg"], ["fg", "surface"], ["fg", "surface-2"], ["muted", "bg"], ["muted", "surface"],
  ["accent-fg", "accent"], ["secondary-fg", "secondary"], ["fg", "accent-soft"], ["fg", "secondary-soft"],
  ["danger", "bg"], ["success", "bg"], ["warning", "bg"],
];
/** Non-text UI (focus ring, borders that carry meaning) needs 3:1. */
const UI_PAIRS = [["focus", "bg"], ["accent", "bg"]];

function checkSet(label, colors) {
  let failed = 0;
  console.log(`\n${label}`);
  console.log("pair".padEnd(30), "ratio".padStart(7), "  AA text  AA large");
  for (const [f, b] of [...TEXT_PAIRS, ...UI_PAIRS]) {
    if (!colors[f] || !colors[b]) continue;
    const fc = parseColor(colors[f]), bc = parseColor(colors[b]);
    if (!fc || !bc) { console.log(`${f} on ${b}`.padEnd(30), "  (cannot read the colour value)"); continue; }
    const r = ratio(fc, bc);
    const ui = UI_PAIRS.some(([x, y]) => x === f && y === b);
    const text = ui ? "n/a" : r >= 4.5 ? "pass" : "FAIL";
    const large = r >= 3 ? "pass" : "FAIL";
    if (!ui && r < 4.5) failed++;
    if (ui && r < 3) failed++;
    console.log(`${f} on ${b}`.padEnd(30), r.toFixed(2).padStart(7), `  ${text.padEnd(8)} ${large}${ui ? "  (non-text, needs 3:1)" : ""}`);
  }
  return failed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tokens = arg("tokens");
  const fg = arg("fg"), bg = arg("bg");
  if (tokens) {
    const { light, dark } = readTokens(readFileSync(tokens, "utf8"));
    let failed = checkSet("Light (default)", light);
    if (dark) failed += checkSet("Dark ([data-theme=\"dark\"])", { ...light, ...dark });
    console.log(failed ? `\n${failed} pair(s) below the bar. Change lightness in the tokens until each passes.` : "\nAll pairs clear WCAG AA.");
    process.exit(failed ? 1 : 0);
  } else if (fg && bg) {
    const f = parseColor(fg), b = parseColor(bg);
    if (!f || !b) { console.error("Cannot read one of the colours. Use #hex, rgb(r g b) or oklch(L C H)."); process.exit(2); }
    const r = ratio(f, b);
    console.log(`${r.toFixed(2)}:1  body text ${r >= 4.5 ? "passes" : "FAILS"} AA (4.5), large text ${r >= 3 ? "passes" : "FAILS"} (3)`);
    process.exit(r >= 4.5 ? 0 : 1);
  } else {
    console.error("Usage: contrast.mjs --fg <colour> --bg <colour>   or   contrast.mjs --tokens <tokens.css>");
    process.exit(2);
  }
}
