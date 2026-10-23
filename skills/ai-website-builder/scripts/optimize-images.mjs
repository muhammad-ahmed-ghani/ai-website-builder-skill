#!/usr/bin/env node
/**
 * Turn original pictures into the responsive set the template's <Img> expects, and write the manifest.
 *
 *   node optimize-images.mjs --src .app-notes/originals --out public/assets --manifest src/lib/assets.ts --alt .app-notes/alt.json
 *
 * For every png/jpg/webp in --src (id = the file name without extension, lower-case, dashes):
 *   public/assets/<id>-<width>.avif and .webp at 480, 800, 1200, 1600 (never larger than the original)
 *   an entry in the manifest: { src, alt, width, height, sources: [avif, webp srcsets], blur }
 * Use it in a page as <Img {...assets["hero"]} sizes="(min-width: 1024px) 50vw, 100vw" priority />.
 * Budgets: the file used as `src` stays under 300 KB for the id "hero" and 150 KB for everything else (quality is lowered step by step to fit).
 * --alt is a JSON file { "hero": "what the picture shows", ... }. A picture with no alt gets an empty one and a warning: write it.
 * Needs `sharp` (pnpm add -D sharp).
 */
import { mkdirSync, readdirSync, statSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const value = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const SRC = path.resolve(value("src", ".app-notes/originals"));
const OUT = path.resolve(value("out", "public/assets"));
const MANIFEST = path.resolve(value("manifest", "src/lib/assets.ts"));
const ALT = value("alt");
const WIDTHS = [480, 800, 1200, 1600];
const HERO_BYTES = 300_000;
const OTHER_BYTES = 150_000;

async function loadSharp() {
  for (const req of [createRequire(path.join(process.cwd(), "noop.js")), createRequire(import.meta.url)]) {
    try {
      return (await import(pathToFileURL(req.resolve("sharp")).href)).default;
    } catch {
      /* next */
    }
  }
  console.error("sharp is not installed. Run: pnpm add -D sharp");
  process.exit(2);
}
const sharp = await loadSharp();

if (!existsSync(SRC)) {
  console.error(`No folder ${SRC}. Put the original pictures there first.`);
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });
const alts = ALT && existsSync(ALT) ? JSON.parse(readFileSync(ALT, "utf8")) : {};
const files = readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && statSync(path.join(SRC, f)).isFile()).sort();
if (!files.length) {
  console.error(`No pictures in ${SRC}.`);
  process.exit(2);
}

const entries = {};
const warnings = [];
for (const file of files) {
  const id = path.parse(file).name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const input = sharp(path.join(SRC, file), { failOn: "none" }).rotate();
  const meta = await input.metadata();
  const maxW = meta.width ?? 1600;
  const widths = [...new Set([...WIDTHS.filter((w) => w < maxW), Math.min(maxW, 1600)])].sort((a, b) => a - b);
  const sources = { avif: [], webp: [] };
  for (const w of widths) {
    for (const fmt of ["avif", "webp"]) {
      const name = `${id}-${w}.${fmt}`;
      const budget = id === "hero" ? HERO_BYTES : OTHER_BYTES;
      let quality = fmt === "avif" ? 55 : 78;
      let buf;
      for (;;) {
        buf = await input.clone().resize({ width: w, withoutEnlargement: true })[fmt]({ quality, ...(fmt === "avif" ? { effort: 4 } : {}) }).toBuffer();
        if (w > 1200 || buf.length <= budget || quality <= 40) break;
        quality -= 8;
      }
      if (w <= 1200 && buf.length > budget) warnings.push(`${name} is ${Math.round(buf.length / 1000)} KB (budget ${Math.round(budget / 1000)} KB): use a simpler or smaller picture`);
      writeFileSync(path.join(OUT, name), buf);
      sources[fmt].push(`/assets/${name} ${w}w`);
    }
  }
  const fallbackW = widths.filter((w) => w <= 1200).pop() ?? widths[0];
  const fallbackMeta = await sharp(path.join(OUT, `${id}-${fallbackW}.webp`)).metadata();
  const blur = `data:image/jpeg;base64,${(await input.clone().resize({ width: 16 }).jpeg({ quality: 40 }).toBuffer()).toString("base64")}`;
  const alt = typeof alts[id] === "string" ? alts[id] : "";
  if (!alt) warnings.push(`"${id}" has no alt text: look at the picture and write what it shows (empty only for decoration)`);
  entries[id] = {
    src: `/assets/${id}-${fallbackW}.webp`,
    alt,
    width: fallbackMeta.width ?? fallbackW,
    height: fallbackMeta.height ?? Math.round((fallbackW * (meta.height ?? 1)) / maxW),
    sources: [
      { type: "image/avif", srcSet: sources.avif.join(", ") },
      { type: "image/webp", srcSet: sources.webp.join(", ") },
    ],
    blur,
  };
  console.log(`${id}: ${widths.join(", ")}px, avif + webp`);
}

mkdirSync(path.dirname(MANIFEST), { recursive: true });
writeFileSync(
  MANIFEST,
  `/**
 * Written by scripts/optimize-images.mjs: every picture has an entry shaped for <Img/>:
 *   <Img {...assets["hero"]} sizes="100vw" priority />
 * Re-run the script when pictures change instead of editing this file.
 */
export interface Asset {
  src: string;
  alt: string;
  width: number;
  height: number;
  sources?: { type: string; srcSet: string }[];
  blur?: string;
}

export const assets = ${JSON.stringify(entries, null, 2)} satisfies Record<string, Asset>;

export const missingAssets: string[] = [];
`,
);
console.log(`\nWrote ${files.length} picture(s) to ${OUT} and the manifest ${MANIFEST}`);
for (const w of warnings) console.warn(`warning: ${w}`);
