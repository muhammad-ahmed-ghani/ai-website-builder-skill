#!/usr/bin/env node
/**
 * Look at a running app the way a visitor meets it, and write down what was measured.
 *
 *   node check-app.mjs --url http://localhost:4173 --routes / /about/ /contact/ --out .app-notes/qa
 *   node check-app.mjs --url http://localhost:4173 --tour            also record a scripted visit (webm) per size
 *   node check-app.mjs --url http://localhost:4173 --flows .app-notes/flows.json    run the features' acceptance flows
 *   node check-app.mjs --url http://localhost:4173 --sizes 390x844,1440x900
 *   node check-app.mjs --url ... --chrome /path/to/chrome            use an installed Chrome instead of Playwright's download
 *
 * Serve the PRODUCTION build (pnpm build && pnpm preview), not the dev server. Needs `playwright` or `playwright-core` with a browser
 * (pnpm add -D playwright && npx playwright install chromium). Routes default to "/" plus every internal link found on it.
 *
 * Writes into --out (default .app-notes/qa):
 *   report.json, report.md        the issues, the verdict, what could not be checked
 *   shots/<route>-<size>-first.png, -full.png, strips/<route>-<size>-<n>.png
 *   contact-sheet.html            open it: one row per page, every size side by side
 *   tour-<size>.webm              with --tour
 * Flows file (--flows): [{ "name": "open a lesson", "size": "desktop", "steps": [ {"do":"goto","path":"/lessons/"}, {"do":"click","selector":"text=Say hello"},
 *   {"do":"fill","selector":"input[name=email]","value":"a@example.com"}, {"do":"press","key":"Enter"}, {"do":"wait","ms":500},
 *   {"do":"assert_text","text":"Say hello"}, {"do":"assert_visible","selector":"main h1"}, {"do":"assert_url","contains":"/lesson"} ] }]
 * Every flow runs in a fresh browser context (like a new visitor), so start each from the sign-in screen when the product has one.
 * Verdict: fail with any blocker, partial with a major or anything not verified, pass otherwise. Exit code 1 on fail.
 * Measured facts only. Looking at the pictures, and judging them, is still your job (see references/06-qa-and-repair.md).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(`--${k}`);
const value = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const list = (k) => {
  const i = argv.indexOf(`--${k}`);
  if (i < 0) return null;
  const out = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith("--"); j++) out.push(...argv[j].split(","));
  return out.filter(Boolean);
};

const base = (value("url", "") || "").replace(/\/+$/, "");
if (!base) {
  console.error("Usage: check-app.mjs --url http://localhost:4173 [--routes / /about/] [--sizes 390x844,768x1024,1440x900] [--out .app-notes/qa] [--tour] [--submit-forms]");
  process.exit(2);
}
const OUT = path.resolve(value("out", ".app-notes/qa"));
const SIZES = (list("sizes") ?? ["390x844", "768x1024", "1440x900"]).map((s) => {
  const [w, h] = s.split("x").map(Number);
  return { w, h, name: w <= 480 ? "phone" : w <= 900 ? "tablet" : "desktop", id: `${w}` };
});
const MAX_PAGE_PX = 15000;

async function loadPlaywright() {
  const here = createRequire(import.meta.url);
  const cwd = createRequire(path.join(process.cwd(), "noop.js"));
  for (const req of [cwd, here]) {
    for (const name of ["playwright", "playwright-core"]) {
      try {
        return await import(pathToFileURL(req.resolve(name)).href);
      } catch {
        /* try the next */
      }
    }
  }
  console.error("Playwright is not installed. Run: pnpm add -D playwright && npx playwright install chromium");
  process.exit(2);
}

const pw = await loadPlaywright();
const chromium = pw.chromium ?? pw.default?.chromium;
const executablePath = value("chrome", process.env.CHROME_PATH);
const browser = await chromium.launch(executablePath ? { executablePath } : {}).catch((e) => {
  console.error(`Could not start a browser: ${String(e.message ?? e).split("\n")[0]}`);
  console.error("Install one with: npx playwright install chromium   (or pass --chrome /path/to/chrome, or set CHROME_PATH)");
  process.exit(2);
});

const issues = [];
const notVerified = [];
const artefacts = [];
const pages = [];
const add = (severity, route, size, category, summary, evidence) => issues.push({ severity, route, size, category, summary, ...(evidence ? { evidence } : {}) });
const slug = (r) => (r === "/" ? "home" : r.replace(/^\/|\/$/g, "").replace(/[^a-z0-9]+/gi, "-"));
mkdirSync(path.join(OUT, "shots"), { recursive: true });
mkdirSync(path.join(OUT, "strips"), { recursive: true });

/** Scroll the page the way a visitor does: a viewport at a time, a pause each, so reveals and scrubbed scenes fire. */
async function walk(page, pause = 350) {
  await page.evaluate(async (ms) => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0, guard = 0; y < document.documentElement.scrollHeight && guard < 60; y += step, guard++) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, ms));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  }, pause);
}

/** The measured facts of the page as it stands. */
const measure = () => {
  const vw = window.innerWidth;
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  };
  const name = (el) => (el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || el.querySelector("img")?.getAttribute("alt") || "").trim();
  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
  const jumps = headings.filter((l, i) => i > 0 && l > headings[i - 1] + 1).length;
  const offenders = [...document.querySelectorAll("body *")]
    .filter((el) => vis(el) && el.getBoundingClientRect().right > vw + 1 && !el.closest("[data-allow-overflow]"))
    .slice(0, 5)
    .map((el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""} (right edge ${Math.round(el.getBoundingClientRect().right)}px)`);
  const small = [...document.querySelectorAll("a,button,input:not([type=hidden]),select,textarea,[role=button]")]
    .filter((el) => vis(el) && !el.closest("p,li") && el.getBoundingClientRect().width > 2 && el.getBoundingClientRect().height > 2 && (el.getBoundingClientRect().width < 44 || el.getBoundingClientRect().height < 44))
    .slice(0, 8)
    .map((el) => `${el.tagName.toLowerCase()} "${name(el).slice(0, 24)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
  const tinyText = [...document.querySelectorAll("p,li")].filter((el) => vis(el) && el.textContent.trim().length > 40 && parseFloat(getComputedStyle(el).fontSize) < 15).length;
  const links = [...document.querySelectorAll("a[href]")];
  const internal = [...new Set(links.map((a) => a.getAttribute("href")).filter((h) => h && !/^(mailto:|tel:|javascript:)/.test(h) && !/^https?:\/\//.test(h) || h?.startsWith(location.origin)))];
  return {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
    lang: document.documentElement.getAttribute("lang") ?? "",
    dir: document.documentElement.getAttribute("dir") ?? "",
    h1: document.querySelectorAll("h1").length,
    headingJumps: jumps,
    landmarks: { header: !!document.querySelector("header"), nav: !!document.querySelector("nav"), main: document.querySelectorAll("main").length, footer: !!document.querySelector("footer") },
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: vw,
    offenders,
    pageHeight: document.documentElement.scrollHeight,
    imgNoAlt: [...document.querySelectorAll("img:not([alt])")].length,
    imgNoSize: [...document.querySelectorAll("img")].filter((i) => !(i.getAttribute("width") && i.getAttribute("height")) && !i.closest("picture")).length,
    deadLinks: links.filter((a) => ["#", "", "javascript:void(0)"].includes((a.getAttribute("href") ?? "").trim())).length,
    unnamedControls: [...document.querySelectorAll("button,a[href],[role=button]")].filter((el) => vis(el) && !name(el)).length,
    inputsNoLabel: [...document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea")].filter((el) => vis(el) && !el.labels?.length && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby")).length,
    smallTargets: small,
    tinyText,
    forms: [...document.forms].map((f) => ({ action: f.getAttribute("action"), fields: f.elements.length })),
    preloader: document.querySelector('[data-preloader="loading"]') ? "still loading" : "",
    internalLinks: internal,
    hasSkipLink: !!document.querySelector('a[href^="#"]'),
  };
};

async function checkRoute(route, size, ctxOptions = {}) {
  const context = await browser.newContext({ viewport: { width: size.w, height: size.h }, isMobile: size.w <= 480, hasTouch: size.w <= 480, deviceScaleFactor: 1, ...ctxOptions });
  const page = await context.newPage();
  const logs = [];
  page.on("console", (m) => m.type() === "error" && logs.push({ kind: "console", text: m.text() }));
  page.on("pageerror", (e) => logs.push({ kind: "uncaught", text: String(e.message ?? e) }));
  page.on("requestfailed", (r) => logs.push({ kind: "request", text: `${r.url()} ${r.failure()?.errorText ?? ""}` }));
  page.on("response", (r) => r.status() >= 400 && logs.push({ kind: "http", text: `${r.status()} ${r.url()}` }));
  const url = base + route;
  const res = await page.goto(url, { waitUntil: "load", timeout: 30000 }).catch((e) => ({ error: String(e.message) }));
  if (!res || res.error || (res.status && res.status() >= 400)) {
    add("blocker", route, size.name, "load", `The page did not load (${res?.error ?? res?.status?.()})`, url);
    await context.close();
    return null;
  }
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  if (await page.$('[data-preloader="loading"]')) await page.waitForTimeout(22000);
  await walk(page);
  const id = `${slug(route)}-${size.id}`;
  await page.screenshot({ path: path.join(OUT, "shots", `${id}-first.png`) });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: path.join(OUT, "shots", `${id}-full.png`), fullPage: true, ...(height > MAX_PAGE_PX ? { clip: { x: 0, y: 0, width: size.w, height: MAX_PAGE_PX }, fullPage: false } : {}) }).catch(() => {});
  const marks = height <= size.h ? [0] : [0, 0.25, 0.5, 0.75, 1];
  const strips = [];
  for (const [n, f] of marks.entries()) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(f * Math.max(0, height - size.h)));
    await page.waitForTimeout(400);
    const file = `${id}-${n + 1}.png`;
    await page.screenshot({ path: path.join(OUT, "strips", file) });
    strips.push(`strips/${file}`);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  const m = await page.evaluate(measure);

  // The measured issues.
  if (m.scrollWidth > m.viewportWidth + 1) add("major", route, size.name, "layout", `Sideways scroll: the page is ${m.scrollWidth}px wide in a ${m.viewportWidth}px window`, m.offenders.join("; "));
  if (m.h1 !== 1) add("major", route, size.name, "seo", m.h1 === 0 ? "The page has no h1" : `The page has ${m.h1} h1 elements`);
  if (m.headingJumps) add("minor", route, size.name, "a11y", `${m.headingJumps} heading level(s) are skipped`);
  if (!m.lang) add("major", route, size.name, "a11y", "<html> has no lang attribute");
  if (!m.title || m.title.length < 20 || m.title.length > 70) add("minor", route, size.name, "seo", `Title is ${m.title.length} characters (aim for 50 to 60): "${m.title}"`);
  if (m.description.length < 100 || m.description.length > 165) add("minor", route, size.name, "seo", `Meta description is ${m.description.length} characters (aim for 110 to 155)`);
  if (m.landmarks.main !== 1) add("major", route, size.name, "a11y", `${m.landmarks.main} <main> landmarks (need exactly one)`);
  if (!m.landmarks.nav && route === "/") add("minor", route, size.name, "a11y", "No <nav> landmark on the home page");
  if (m.imgNoAlt) add("major", route, size.name, "a11y", `${m.imgNoAlt} image(s) have no alt attribute`);
  if (m.imgNoSize) add("minor", route, size.name, "performance", `${m.imgNoSize} image(s) have no width and height (layout shift)`);
  if (m.deadLinks) add("major", route, size.name, "interaction", `${m.deadLinks} link(s) go nowhere (href "#" or empty)`);
  if (m.unnamedControls) add("major", route, size.name, "a11y", `${m.unnamedControls} control(s) have no accessible name`);
  if (m.inputsNoLabel) add("major", route, size.name, "a11y", `${m.inputsNoLabel} form field(s) have no label`);
  if (size.w <= 480 && m.smallTargets.length) add("minor", route, size.name, "a11y", `${m.smallTargets.length} tap target(s) under 44px`, m.smallTargets.join("; "));
  if (size.w <= 480 && m.tinyText) add("minor", route, size.name, "a11y", `${m.tinyText} paragraph(s) set under 15px on the phone`);
  if (m.forms.some((f) => /^(#|mailto:)/.test(f.action ?? "") || /formspree|formsubmit|getform|web3forms/.test(f.action ?? ""))) add("blocker", route, size.name, "forms", "A form posts to # or mailto, or to a third-party form service", JSON.stringify(m.forms));
  if (m.preloader) add("major", route, size.name, "interaction", "A preloader was still showing 22 seconds after load");
  for (const l of logs) {
    const hydration = /hydrat|#418|#423|#425|did not match/i.test(l.text);
    const artefact = /ResizeObserver|\[vite\]|hot update|favicon|net::ERR_ABORTED/i.test(l.text);
    if (artefact) artefacts.push({ route, size: size.name, ...l });
    else add(l.kind === "http" && !/^4(04)/.test(l.text) ? "major" : "blocker", route, size.name, hydration ? "hydration" : "console-error", `${l.kind}: ${l.text.slice(0, 200)}`);
  }
  const record = { route, size: size.name, width: size.w, ...m, first: `shots/${id}-first.png`, full: `shots/${id}-full.png`, strips };
  await context.close();
  return record;
}

// ---- which routes ----
let routes = list("routes");
if (!routes) {
  routes = ["/"];
  const probe = await browser.newPage();
  await probe.goto(base + "/", { waitUntil: "load", timeout: 30000 }).catch(() => {});
  const links = await probe.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("/") && !h.startsWith("//") && !/\.[a-z0-9]{2,5}$/i.test(h)).map((h) => h.split("#")[0].split("?")[0]));
  await probe.close();
  routes.push(...new Set(links.filter((h) => h && h !== "/")));
}
routes = [...new Set(routes.map((r) => (r === "/" || r.endsWith("/") ? r : r + "/")))];

for (const route of routes) {
  for (const size of SIZES) {
    process.stdout.write(`${route} ${size.name} ... `);
    const rec = await checkRoute(route, size);
    console.log(rec ? "ok" : "FAILED to load");
    if (rec) pages.push(rec);
  }
}

// ---- links: every internal link found, once ----
if (!flag("no-links") && pages.length) {
  const seen = new Set();
  const ctx = await browser.newContext();
  const req = ctx.request;
  for (const p of pages.filter((x) => x.size === "desktop" || x === pages[0])) {
    for (const href of p.internalLinks) {
      const [rawPath, hash] = href.split("#");
      const target = rawPath ? new URL(rawPath, base + p.route).pathname : p.route;
      const key = target + (hash ? "#" + hash : "");
      if (seen.has(key)) continue;
      seen.add(key);
      const res = await req.get(base + target).catch(() => null);
      if (!res || res.status() >= 400) add("major", p.route, "all", "broken-link", `Link "${href}" answers ${res ? res.status() : "no response"}`);
      else if (hash && !(await res.text()).includes(`id="${hash}"`)) add("minor", p.route, "all", "broken-link", `The anchor #${hash} is not on ${target}`);
    }
  }
  await ctx.close();
}

// ---- acceptance flows: each feature's steps, in a fresh visitor each ----
const flowResults = [];
const flowsFile = value("flows");
if (flowsFile) {
  const { readFileSync } = await import("node:fs");
  let flows = [];
  try {
    flows = JSON.parse(readFileSync(flowsFile, "utf8"));
  } catch (e) {
    notVerified.push(`The flows file ${flowsFile} could not be read: ${String(e.message ?? e).slice(0, 100)}`);
  }
  for (const flow of flows) {
    const size = SIZES.find((x) => x.name === (flow.size ?? "desktop")) ?? SIZES[SIZES.length - 1];
    const context = await browser.newContext({ viewport: { width: size.w, height: size.h }, isMobile: size.w <= 480, hasTouch: size.w <= 480 });
    const page = await context.newPage();
    let failed = null;
    for (const [n, step] of (flow.steps ?? []).entries()) {
      try {
        const t = { timeout: 6000 };
        if (step.do === "goto") await page.goto(base + step.path, { waitUntil: "load", timeout: 20000 });
        else if (step.do === "reload") await page.reload({ waitUntil: "load" });
        else if (step.do === "click") await page.locator(step.selector).first().click(t);
        else if (step.do === "fill") await page.locator(step.selector).first().fill(String(step.value ?? ""), t);
        else if (step.do === "press") await page.keyboard.press(step.key);
        else if (step.do === "wait") await page.waitForTimeout(Number(step.ms ?? 300));
        else if (step.do === "assert_visible") await page.locator(step.selector).first().waitFor({ state: "visible", ...t });
        else if (step.do === "assert_text") await page.locator(step.selector ?? "body").first().getByText(String(step.text), { exact: false }).first().waitFor({ state: "visible", ...t });
        else if (step.do === "assert_url") {
          await page.waitForURL((u) => u.href.includes(String(step.contains)), { timeout: 6000 });
        } else throw new Error(`unknown step "${step.do}"`);
      } catch (e) {
        failed = { step: n + 1, do: step.do, error: String(e.message ?? e).split("\n")[0].slice(0, 160) };
        break;
      }
    }
    flowResults.push({ name: flow.name, size: size.name, ok: !failed, ...(failed ? { failed } : {}) });
    if (failed) {
      await page.screenshot({ path: path.join(OUT, "shots", `flow-${slug("/" + String(flow.name).replace(/\s+/g, "-").toLowerCase())}-failed.png`) }).catch(() => {});
      add("major", flow.steps?.find((x) => x.do === "goto")?.path ?? "/", size.name, "flow", `Flow "${flow.name}" failed at step ${failed.step} (${failed.do}): ${failed.error}`);
    }
    await context.close();
    console.log(`flow "${flow.name}": ${failed ? "FAILED at step " + failed.step : "ok"}`);
  }
} else {
  notVerified.push("No acceptance flows were run (pass --flows .app-notes/flows.json): features were not exercised end to end.");
}

// ---- the scripted visit (one video per size) ----
if (flag("tour")) {
  for (const size of [SIZES[0], SIZES[SIZES.length - 1]]) {
    const context = await browser.newContext({ viewport: { width: size.w, height: size.h }, isMobile: size.w <= 480, hasTouch: size.w <= 480, recordVideo: { dir: OUT, size: { width: Math.min(size.w, 960), height: Math.round((Math.min(size.w, 960) / size.w) * size.h) } } });
    const page = await context.newPage();
    try {
      await page.goto(base + "/", { waitUntil: "load" });
      await walk(page, 900);
      const cta = page.locator("main a, main button").first();
      if (await cta.count()) await cta.hover().catch(() => {});
      for (let i = 0; i < 8; i++) await page.keyboard.press("Tab").then(() => page.waitForTimeout(150));
      for (const route of routes.slice(1, 6)) {
        await page.goto(base + route, { waitUntil: "load" });
        await walk(page, 700);
        for (const form of await page.$$("form")) {
          for (const input of await form.$$("input:not([type=hidden]):not([type=submit]):not([name*=bot i]), textarea")) {
            const type = (await input.getAttribute("type")) ?? "text";
            const nm = ((await input.getAttribute("name")) ?? "").toLowerCase();
            await input.fill(type === "email" || nm.includes("mail") ? "qa-test@example.com" : type === "tel" || nm.includes("phone") ? "555 0100" : "This is a test message from the QA visit, please ignore it.").catch(() => {});
          }
          if (flag("submit-forms")) {
            await (await form.$("[type=submit],button")).click().catch(() => {});
            await page.waitForTimeout(2500);
          } else notVerified.push(`Form on ${route} was filled but not submitted (pass --submit-forms with a safe endpoint to verify the result).`);
        }
      }
    } catch (e) {
      notVerified.push(`The ${size.name} tour stopped: ${String(e.message ?? e).slice(0, 120)}`);
    }
    const video = page.video();
    await context.close();
    try {
      const { renameSync } = await import("node:fs");
      renameSync(await video.path(), path.join(OUT, `tour-${size.name}.webm`));
    } catch {
      /* the recording keeps its generated name */
    }
    console.log(`tour ${size.name}: recorded`);
  }
} else {
  notVerified.push("No scripted tour was recorded (run with --tour): menus, form behaviour and scroll-driven scenes were not exercised.");
}

await browser.close();

// ---- verdict and files ----
const order = { blocker: 0, major: 1, minor: 2 };
issues.sort((a, b) => order[a.severity] - order[b.severity]);
const counts = { blocker: 0, major: 0, minor: 0 };
for (const i of issues) counts[i.severity]++;
const verdict = counts.blocker ? "fail" : counts.major || notVerified.length ? "partial" : "pass";
const report = { verdict, counts, base, routes, sizes: SIZES.map((s) => `${s.w}x${s.h}`), flows: flowResults, issues, artefacts: artefacts.slice(0, 40), notVerified, pages: pages.map(({ internalLinks, ...p }) => p) };
writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));

const md = [
  `# QA report: ${verdict.toUpperCase()}`,
  `${counts.blocker} blockers, ${counts.major} majors, ${counts.minor} minors. Pages: ${routes.join(", ")}. Sizes: ${report.sizes.join(", ")}.`,
  "",
  "## Issues",
  ...(issues.length ? issues.map((i) => `- **${i.severity}** \`${i.route}\` ${i.size}, ${i.category}: ${i.summary}${i.evidence ? ` (${i.evidence})` : ""}`) : ["None measured."]),
  "",
  "## Flows",
  ...(flowResults.length ? flowResults.map((f) => `- ${f.ok ? "pass" : "FAIL"} "${f.name}" (${f.size})${f.ok ? "" : `: step ${f.failed.step} ${f.failed.do}: ${f.failed.error}`}`) : ["None run."]),
  "",
  "## Not verified",
  ...(notVerified.length ? [...new Set(notVerified)].map((n) => `- ${n}`) : ["Nothing."]),
  "",
  "## Artefacts (kept out of the count, not hidden)",
  ...(artefacts.length ? artefacts.slice(0, 15).map((a) => `- \`${a.route}\` ${a.size}: ${a.kind} ${a.text.slice(0, 120)}`) : ["None."]),
  "",
  "Open `contact-sheet.html` and look at the pictures: measured facts are not a verdict on how it reads.",
].join("\n");
writeFileSync(path.join(OUT, "report.md"), md);

const rows = routes
  .map((r) => `<tr><th>${r}</th>${SIZES.map((s) => `<td><a href="shots/${slug(r)}-${s.id}-full.png"><img loading="lazy" src="shots/${slug(r)}-${s.id}-first.png" alt="${r} at ${s.name}" style="max-width:${s.w <= 480 ? 220 : s.w <= 900 ? 300 : 520}px;border:1px solid #ccc"></a></td>`).join("")}</tr>`)
  .join("\n");
writeFileSync(path.join(OUT, "contact-sheet.html"), `<!doctype html><meta charset="utf-8"><title>Contact sheet</title><style>body{font:14px system-ui;margin:16px}td,th{vertical-align:top;padding:8px;text-align:left}</style><h1>Contact sheet</h1><p>Click a picture for the whole page.</p><table><tr><th></th>${SIZES.map((s) => `<th>${s.name} ${s.w}</th>`).join("")}</tr>${rows}</table>`);

console.log(`\nVerdict: ${verdict.toUpperCase()}  (${counts.blocker} blockers, ${counts.major} majors, ${counts.minor} minors)`);
console.log(`Report: ${path.join(OUT, "report.md")}\nPictures: ${path.join(OUT, "contact-sheet.html")}`);
process.exit(verdict === "fail" ? 1 : 0);
