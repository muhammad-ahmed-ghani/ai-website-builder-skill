#!/usr/bin/env node
/**
 * Proves the design scan against two fixture pages: slop.html must trip every rule listed below, clean.html must trip none.
 *   node tools/tests/design-scan.test.mjs [--chrome /path/to/chrome]
 * Needs Playwright (or --chrome / CHROME_PATH), like scripts/check-app.mjs.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const checker = path.join(root, "skills", "ai-website-builder", "scripts", "check-app.mjs");
const chromeArg = process.argv.includes("--chrome") ? ["--chrome", process.argv[process.argv.indexOf("--chrome") + 1]] : [];

const MUST_FIRE = [
  "low-contrast", "low-contrast-aa", "gray-on-color", "text-occluded", "content-hidden-at-rest", "broken-image", "flat-type-hierarchy", "line-length",
  "tight-leading", "tiny-text", "all-caps-body", "wide-tracking", "extreme-tracking", "justified-text", "unbalanced-heading", "heading-rhythm",
  "body-text-edge", "cramped-padding", "nested-cards", "side-tab", "gradient-text", "glow", "bounce-easing", "marquee", "motion-ignores-preference",
  "overused-font", "cream-palette", "hard-offset-shadow", "ghost-card", "icon-tile-stack", "kicker-above-heading", "numbered-labels", "glyph-icon",
  "pulsing-dot", "decorative-pattern", "ai-prose-words", "button-label-wraps", "too-many-weights", "focus-not-visible", "copy-residue", "copy-placeholder", "copy-no-em-dash", "copy-proof-trusted-by", "copy-not-just-its", "em-dash-saturation", "aphoristic-cadence", "browser-surfaces",
];

const server = http.createServer((q, r) => {
  const name = q.url.startsWith("/slop") ? "slop.html" : q.url.startsWith("/clean") ? "clean.html" : q.url.startsWith("/fold") ? "fold.html" : null;
  if (!name) { r.writeHead(q.url === "/favicon.ico" ? 204 : 404); return r.end(); }
  r.writeHead(200, { "content-type": "text/html" });
  r.end(readFileSync(path.join(here, "fixtures", name)));
});
await new Promise((res) => server.listen(0, res));
const url = `http://localhost:${server.address().port}`;
const out = mkdtempSync(path.join(os.tmpdir(), "design-scan-"));
// Async on purpose: spawnSync would block this process, and the fixture server lives in it.
const run = await new Promise((resolve) => {
  const child = spawn("node", [checker, "--url", url, "--routes", "/slop", "/clean", "/fold", "--sizes", "390x844,1440x900", "--no-links", "--out", out, ...chromeArg]);
  let text = "";
  child.stdout.on("data", (d) => (text += d));
  child.stderr.on("data", (d) => (text += d));
  child.on("close", (status) => resolve({ status, text }));
});
server.close();
if (run.status === 2) { console.error(run.text); process.exit(2); }
const report = JSON.parse(readFileSync(path.join(out, "report.json"), "utf8"));
const fired = (route) => new Set(report.issues.filter((i) => i.rule && i.route === route).map((i) => i.rule));
const slop = fired("/slop/"), clean = fired("/clean/"), fold = fired("/fold/");
const missing = MUST_FIRE.filter((r) => !slop.has(r));
let failed = false;
if (missing.length) { failed = true; console.error(`slop.html did not trip: ${missing.join(", ")}`); }
if (clean.size) { failed = true; console.error(`clean.html tripped: ${[...clean].join(", ")}`); }
if (!fold.has("below-the-fold")) { failed = true; console.error("fold.html did not trip below-the-fold"); }
console.log(`slop.html tripped ${slop.size} rules (${MUST_FIRE.length - missing.length}/${MUST_FIRE.length} expected); clean.html tripped ${clean.size}.`);
process.exit(failed ? 1 : 0);
