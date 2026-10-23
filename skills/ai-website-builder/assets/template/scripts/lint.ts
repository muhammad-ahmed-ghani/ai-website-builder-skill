/**
 * Design-contract lint. No dependencies (no ESLint on purpose): a handful of regex rules that keep a generated app
 * on the token contract and the accessibility/SEO floor. Run with `pnpm lint`; exits 1 on any finding.
 *
 * Scans src/**\/*.{ts,tsx,css} except the token files themselves (tokens.css, fonts.css, theme-reset.css).
 * Rules (id: what it catches):
 *   palette:        Tailwind palette classes (bg-zinc-500, text-red-600, bg-white, text-black ...). Use token utilities.
 *   raw-color:      hex / rgb() / hsl() / oklch() literals in code. Colours live in tokens.css only.
 *   arbitrary-style: arbitrary colour, radius or font values (bg-[#fff], rounded-[6px], font-['x']).
 *   font-source:    Google Fonts, next/font or font-family declared outside the token files.
 *   img-alt:        <img> without alt (use components/core/Img).
 *   seo:            a file in src/pages without <Seo>.
 *   bare-img:       <img> outside components/core/Img.tsx. <Img> reserves the box, lazy-loads and serves avif/webp.
 *   image-budget:   a raster file in public/assets over the byte budget in scripts/budgets.json (hero 300 KB, others 150 KB).
 *   immersive-budget: a file declared by public/assets/immersive/<id>/manifest.json over its own budget (declared media is exempt from image-budget, nothing else is).
 *   immersive-src:  an immersive component pointed at a file outside /assets/immersive/ (use the entries of src/lib/immersive.ts).
 *   bare-video:     <video> outside components/immersive (autoplay, sound, no poster, no reduced-motion path). Use LoopVideo or ScrubVideo.
 *   html-injection: dangerouslySetInnerHTML.
 *   config:         tailwind.config.* or postcss.config.* (Tailwind v4 is CSS-first, config lives in index.css).
 *   placeholder:    lorem ipsum.
 * App rules (only when src/app.config.ts says `kind: "app"`, see lintApp):
 *   app-credentials:       src/app/accounts.ts lists demo accounts but no page or section renders <SignInForm> or <DemoCredentials>.
 *   app-entry:             the "/" page (unless its route has chrome "pages") never reaches an <AuthGate> or <AppShell>.
 *   app-marketing:         the "/" page imports a marketing section (Hero, Faq, Steps, Pricing, Testimonials, FinalCta ...). `/` is the app.
 *   app-draft-credentials: a <Draft> standing in for a password, login, email or account. Credentials are shown with <SignInForm>.
 *   app-ungated-route:     (warning, does not fail) an app route whose page has no <AuthGate>.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface Finding {
  file: string;
  line: number;
  rule: string;
  message: string;
  /** Absent or "error" fails the lint; "warn" is printed and does not. */
  severity?: "error" | "warn";
}

const PALETTES =
  "slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_UTILS = "bg|text|border|ring|outline|fill|stroke|from|via|to|divide|decoration|accent|caret|shadow|placeholder|ring-offset";

const CLASS_RULES: Array<{ rule: string; re: RegExp; message: string }> = [
  {
    rule: "palette",
    re: new RegExp(`\\b(?:${COLOR_UTILS})-(?:${PALETTES})-(?:\\d{2,3}|950)\\b`),
    message: "Tailwind palette class. Use a token utility (bg-bg, bg-surface, text-fg, text-muted, border-line, bg-accent ...).",
  },
  {
    rule: "palette",
    re: new RegExp(`\\b(?:${COLOR_UTILS})-(?:white|black)\\b`),
    message: "bg-white / text-black style class. Use token utilities (bg-bg, text-fg, bg-accent, text-accent-fg ...).",
  },
  {
    rule: "arbitrary-style",
    re: new RegExp(`\\b(?:${COLOR_UTILS})-\\[(?:#|rgb|hsl|oklch|oklab|lab|lch)`),
    message: "Arbitrary colour value. Add or change a token instead.",
  },
  {
    rule: "arbitrary-style",
    re: /\brounded(?:-[a-z]{1,2})?-\[/,
    message: "Arbitrary radius. Use rounded-sm|md|lg|xl|full (tokens).",
  },
  {
    rule: "arbitrary-style",
    re: /\bfont-\[(?:['"]|family-name|var\(--font)/,
    message: "Arbitrary font family. Use font-display, font-sans or font-mono (tokens).",
  },
];

const RAW_COLOR_FN = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/;
const HEX_STRING = /["'`]#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})["'`]/;
const HEX_CSS = /:\s*#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/;

const TOKEN_FILES = new Set(["tokens.css", "fonts.css", "theme-reset.css"]);

const RASTER = /\.(?:jpe?g|png|webp|avif|gif)$/i;

type ImageBudget = { heroBytes: number; otherBytes: number };

/** The project's byte budgets (scripts/budgets.json); the numbers below are the platform defaults if the file is missing. */
export function readImageBudget(root: string): ImageBudget {
  try {
    const j = JSON.parse(readFileSync(path.join(root, "scripts", "budgets.json"), "utf8")) as { image?: Partial<ImageBudget> };
    return { heroBytes: j.image?.heroBytes ?? 300_000, otherBytes: j.image?.otherBytes ?? 150_000 };
  } catch {
    return { heroBytes: 300_000, otherBytes: 150_000 };
  }
}

type ImmersiveLimits = { frameBytes: number; posterBytes: number; cutoutBytes: number; mascotBytes: number };

/** The immersive per-file limits (scripts/budgets.json, `immersive`); the numbers below are the platform defaults if the file is missing. */
export function readImmersiveBudget(root: string): ImmersiveLimits {
  const d: ImmersiveLimits = { frameBytes: 90_000, posterBytes: 300_000, cutoutBytes: 250_000, mascotBytes: 80_000 };
  try {
    const j = JSON.parse(readFileSync(path.join(root, "scripts", "budgets.json"), "utf8")) as { immersive?: Record<string, { max?: number } | undefined> };
    const im = j.immersive ?? {};
    return { frameBytes: im.frameBytes?.max ?? d.frameBytes, posterBytes: im.posterBytes?.max ?? d.posterBytes, cutoutBytes: im.cutoutBytes?.max ?? d.cutoutBytes, mascotBytes: im.mascotBytes?.max ?? d.mascotBytes };
  } catch {
    return d;
  }
}

/** What a manifest declares: project-relative path -> role. Only files listed in an immersive manifest are declared. */
export function declaredImmersiveFiles(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const base = path.join(root, "public", "assets", "immersive");
  if (!existsSync(base)) return out;
  for (const id of readdirSync(base)) {
    const manifest = path.join(base, id, "manifest.json");
    if (!existsSync(manifest)) continue;
    try {
      const j = JSON.parse(readFileSync(manifest, "utf8")) as { files?: { path?: unknown; role?: unknown }[] };
      for (const f of j.files ?? []) {
        if (typeof f.path !== "string" || f.path.includes("..") || f.path.startsWith("/")) continue;
        out.set(path.join("public", "assets", "immersive", id, f.path).replace(/\\/g, "/"), typeof f.role === "string" ? f.role : "poster");
      }
    } catch {
      /* an unreadable manifest declares nothing, so nothing is exempt */
    }
  }
  return out;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(?:tsx?|css)$/.test(name) && !name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

/** Blank out comments (keeping line numbers) so prose that mentions <img> or class names is not linted. */
function stripComments(content: string): string {
  const blank = (match: string) => match.replace(/[^\n]/g, " ");
  return content.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[\s;{}(,])\/\/[^\n]*/g, blank);
}

/** Every file under a directory (public/assets), unlike walk() which only returns source files and skips dot-directories. */
function walk2(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk2(full, out);
    else out.push(full);
  }
  return out;
}

export function lintFileContent(file: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const base = path.basename(file);
  if (TOKEN_FILES.has(base)) return findings;
  const isCss = file.endsWith(".css");
  const lines = content.split("\n");

  lines.forEach((text, index) => {
    const line = index + 1;
    const add = (rule: string, message: string) => findings.push({ file, line, rule, message });
    const trimmed = text.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return; // comments

    if (!isCss) {
      for (const { rule, re, message } of CLASS_RULES) if (re.test(text)) add(rule, message);
    } else {
      // CSS files: classes appear only in @apply
      if (/@apply\b/.test(text)) for (const { rule, re, message } of CLASS_RULES) if (re.test(text)) add(rule, message);
    }
    if (RAW_COLOR_FN.test(text)) add("raw-color", "Raw colour function. Colours come from tokens.css (var(--color-*) or a token utility).");
    if (isCss ? HEX_CSS.test(text) : HEX_STRING.test(text)) add("raw-color", "Hex colour literal. Colours come from tokens.css.");
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com|next\/font/.test(text)) {
      add("font-source", "Network fonts are not allowed. Import a @fontsource(-variable)/* package in src/styles/fonts.css.");
    }
    if (isCss && /font-family\s*:/.test(text)) add("font-source", "font-family declared outside the token files. Use font-display/font-sans/font-mono.");
    if (isCss && /border-radius\s*:\s*[\d.]+(?:px|rem)/.test(text)) add("arbitrary-style", "Fixed border-radius. Use var(--radius-*) or rounded-* utilities.");
    if (!isCss && /dangerouslySetInnerHTML/.test(text)) add("html-injection", "dangerouslySetInnerHTML is not allowed. Render elements, or pass JSON-LD to <Seo jsonLd>.");
    if (/lorem ipsum/i.test(text)) add("placeholder", "Lorem ipsum. Write real copy or say plainly that a section is a placeholder.");
  });

  if (!isCss) {
    for (const match of stripComments(content).matchAll(/<img\b[^>]*>/g)) {
      const tag = match[0];
      if (!/\balt\s*=/.test(tag) && !/\{\s*\.\.\./.test(tag)) {
        const line = content.slice(0, match.index).split("\n").length;
        findings.push({ file, line, rule: "img-alt", message: "<img> without alt. Use <Img alt=...> from components/core." });
      }
    }
    if (!/(?:^|[\\/])components[\\/]core[\\/]Img\.tsx$/.test(file)) {
      for (const match of stripComments(content).matchAll(/<img\b[^>]*>/g)) {
        if (!/\balt\s*=/.test(match[0])) continue; // reported as img-alt above
        const line = content.slice(0, match.index).split("\n").length;
        findings.push({ file, line, rule: "bare-img", message: "Bare <img>. Use <Img> from components/core: it reserves the box (no layout shift), lazy-loads, and serves the avif/webp variants." });
      }
    }
    const code = stripComments(content);
    if (!/(?:^|[\\/])components[\\/]immersive[\\/]/.test(file)) {
      for (const match of code.matchAll(/<video\b/g)) {
        const line = content.slice(0, match.index).split("\n").length;
        findings.push({ file, line, rule: "bare-video", message: "Bare <video>. Use <LoopVideo> or <ScrubVideo> from components/immersive: they keep a poster, reserve the space, stay muted, pause off screen and under reduced motion, and are never fetched for Save-Data visitors." });
      }
      for (const match of code.matchAll(/<(ScrubFrames|ScrubVideo|LoopVideo|CutOut|Mascot)\b([^>]*?)>/gs)) {
        for (const prop of match[2]!.matchAll(/\b(src|svg|dir|mobileSrc)\s*=\s*["']([^"']+)["']/g)) {
          if (!/^\/assets\/immersive\//.test(prop[2]!)) {
            const line = content.slice(0, match.index).split("\n").length;
            findings.push({ file, line, rule: "immersive-src", message: `<${match[1]} ${prop[1]}="${prop[2]}"> points outside /assets/immersive/. Spread an entry of src/lib/immersive.ts instead: {...immersive["id"]}. The platform makes the media (immersive_make).` });
          }
        }
      }
    }
    if (/(?:^|[\\/])src[\\/]pages[\\/][^\\/]+\.tsx$/.test(file) && !/<Seo\b/.test(content)) {
      findings.push({ file, line: 1, rule: "seo", message: "Page without <Seo>. Every page renders exactly one <Seo title description />." });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------------------------------- app rules

const MARKETING_SECTION = /^(?:Hero|Faq|FAQ|Steps|HowItWorks|Pricing|Testimonials?|FinalCta|LogoCloud|Features?|CtaBand)$/;
const CREDENTIAL_DRAFT = /password|credential|login|sign-?in|email|account/i;

/** True when src/app.config.ts declares `kind: "app"` (comments ignored). */
export function isAppProject(root: string): boolean {
  const file = path.join(root, "src", "app.config.ts");
  if (!existsSync(file)) return false;
  return /\bkind\s*:\s*["']app["']/.test(stripComments(readFileSync(file, "utf8")));
}

export interface RouteInfo {
  path: string;
  /** The identifier given as `Component`, or null. */
  component: string | null;
  /** The explicit `chrome` of the route, or null. */
  chrome: string | null;
}

/** The route objects of src/routes.tsx (`{ path: "/x", Component: X, chrome: "app" }`), read with regexes: the table is plain data. */
export function parseRoutes(source: string): RouteInfo[] {
  const code = stripComments(source);
  const out: RouteInfo[] = [];
  for (const match of code.matchAll(/\{[^{}]*?\bpath\s*:\s*["'`]([^"'`]+)["'`][^{}]*\}/g)) {
    const body = match[0];
    out.push({
      path: match[1] as string,
      component: /\bComponent\s*:\s*([A-Za-z_$][\w$]*)/.exec(body)?.[1] ?? null,
      chrome: /\bchrome\s*:\s*["'](\w+)["']/.exec(body)?.[1] ?? null,
    });
  }
  return out;
}

interface ImportInfo {
  names: string[];
  spec: string;
  line: number;
}

function importsOf(source: string): ImportInfo[] {
  const code = stripComments(source);
  const out: ImportInfo[] = [];
  for (const match of code.matchAll(/import\s+(?:type\s+)?([^;'"]*?)\s*from\s*["']([^"']+)["']/g)) {
    const clause = match[1] as string;
    const names: string[] = [];
    const named = /\{([^}]*)\}/.exec(clause)?.[1];
    for (const part of (named ?? "").split(",")) {
      const local = part.trim().split(/\s+as\s+/).pop()?.trim().replace(/^type\s+/, "");
      if (local) names.push(local);
    }
    const def = /^([A-Za-z_$][\w$]*)\s*(?:,|$)/.exec(clause.trim())?.[1];
    if (def) names.push(def);
    out.push({ names, spec: match[2] as string, line: code.slice(0, match.index).split("\n").length });
  }
  return out;
}

/** The file a module specifier ("@/pages/Home", "./Hero") points at, or null. */
function resolveModule(root: string, fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(root, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const candidate of [`${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** A page and the page/section files it imports, followed to any depth. The text of each is returned with its comments blanked. */
function pageSources(root: string, entry: string): Array<{ file: string; code: string }> {
  const seen = new Set<string>();
  const out: Array<{ file: string; code: string }> = [];
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = readFileSync(file, "utf8");
    out.push({ file, code: stripComments(text) });
    for (const imported of importsOf(text)) {
      const next = resolveModule(root, file, imported.spec);
      if (next && /[\\/]src[\\/](?:pages|sections)[\\/]/.test(next)) visit(next);
    }
  };
  visit(entry);
  return out;
}

/** Every .tsx file under src/pages and src/sections. */
function pageAndSectionFiles(root: string): string[] {
  const out: string[] = [];
  for (const dir of ["pages", "sections"]) {
    const full = path.join(root, "src", dir);
    if (existsSync(full)) for (const file of walk(full)) if (file.endsWith(".tsx")) out.push(file);
  }
  return out;
}

const lineOf = (code: string, index: number | undefined) => code.slice(0, index ?? 0).split("\n").length;

/**
 * Rules for a working application (app.config.ts `kind: "app"`): the demo credentials must be on the login screen, "/" must be
 * the app and not a landing page, and app screens sit behind a gate. Returns nothing for an app.
 */
export function lintApp(root: string): Finding[] {
  if (!isAppProject(root)) return [];
  const findings: Finding[] = [];
  const rel = (file: string) => path.relative(root, file).replace(/\\/g, "/");
  const files = pageAndSectionFiles(root);
  const texts = new Map(files.map((file) => [file, stripComments(readFileSync(file, "utf8"))]));

  // app-credentials
  const accounts = path.join(root, "src", "app", "accounts.ts");
  if (existsSync(accounts) && /\bemail\s*:/.test(stripComments(readFileSync(accounts, "utf8")))) {
    const shown = [...texts.values()].some((code) => /<(?:SignInForm|DemoCredentials)\b/.test(code));
    if (!shown) {
      findings.push({
        file: "src/app/accounts.ts",
        line: 1,
        rule: "app-credentials",
        message: "The demo accounts are never shown. The login screen must render <SignInForm accounts={demoAccounts} /> (or <DemoCredentials>) so the credentials are visible without asking anyone.",
      });
    }
  }

  // app-draft-credentials
  for (const [file, code] of texts) {
    for (const match of code.matchAll(/<Draft\b[^>]*>/g)) {
      const tag = match[0];
      const id = /\bid\s*=\s*\{?\s*["'`]([^"'`]*)["'`]/.exec(tag)?.[1] ?? "";
      const label = /\blabel\s*=\s*\{?\s*["'`]([^"'`]*)["'`]/.exec(tag)?.[1] ?? "";
      if (CREDENTIAL_DRAFT.test(id) || CREDENTIAL_DRAFT.test(label)) {
        findings.push({
          file: rel(file),
          line: lineOf(code, match.index),
          rule: "app-draft-credentials",
          message: "A <Draft> for credentials. The demo accounts are real data of the demo: show them with <SignInForm accounts={demoAccounts} />, never a placeholder, never \"ask your admin\".",
        });
      }
    }
  }

  // the route table
  const routesFile = path.join(root, "src", "routes.tsx");
  if (!existsSync(routesFile)) return findings;
  const routesSource = readFileSync(routesFile, "utf8");
  const routeImports = importsOf(routesSource);
  const pageFileOf = (route: RouteInfo): string | null => {
    if (!route.component) return null;
    const imported = routeImports.find((i) => i.names.includes(route.component as string));
    return imported ? resolveModule(root, routesFile, imported.spec) : null;
  };
  const gated = (file: string) => pageSources(root, file).some((source) => /\bAuthGate\b/.test(source.code));

  for (const route of parseRoutes(routesSource)) {
    const page = pageFileOf(route);
    if (!page) continue;
    const isEntry = route.path === "/";

    if (isEntry && route.chrome !== "pages") {
      // app-entry
      if (!pageSources(root, page).some((source) => /\b(?:AuthGate|AppShell)\b/.test(source.code))) {
        findings.push({
          file: rel(page),
          line: 1,
          rule: "app-entry",
          message: "The page at \"/\" is the app, but it never renders <AuthGate> or <AppShell>. In an app, / is the workspace (a landing page, if asked for, lives at /welcome with chrome \"app\").",
        });
      }
      // app-marketing
      for (const imported of importsOf(readFileSync(page, "utf8"))) {
        const target = resolveModule(root, page, imported.spec);
        const inSections = /(?:^|[\\/])sections[\\/]/.test(imported.spec) || (target !== null && /[\\/]src[\\/]sections[\\/]/.test(target));
        if (!inSections) continue;
        const base = path.basename(imported.spec);
        const hit = [...imported.names, base].find((name) => MARKETING_SECTION.test(name));
        if (hit) {
          findings.push({
            file: rel(page),
            line: imported.line,
            rule: "app-marketing",
            message: `The page at "/" imports the marketing section ${hit}. An app has no hero, steps, FAQ, pricing, testimonials or final call to action at "/": the workspace is the first screen.`,
          });
        }
      }
    }

    // app-ungated-route
    if (route.chrome !== "pages" && !gated(page)) {
      findings.push({
        file: rel(page),
        line: 1,
        rule: "app-ungated-route",
        severity: "warn",
        message: `Route "${route.path}" has no <AuthGate>. Wrap the screen: <AuthGate title="..."> (role="admin" for admin screens, guest for the login screen).`,
      });
    }
  }
  return findings;
}

export function lintProject(root: string): Finding[] {
  const findings: Finding[] = [];
  const src = path.join(root, "src");
  if (existsSync(src)) {
    for (const file of walk(src)) {
      findings.push(...lintFileContent(path.relative(root, file), readFileSync(file, "utf8")));
    }
  }
  const assets = path.join(root, "public", "assets");
  if (existsSync(assets)) {
    const budget = readImageBudget(root);
    const declared = declaredImmersiveFiles(root);
    const immersive = readImmersiveBudget(root);
    for (const file of walk2(assets)) {
      if (!RASTER.test(file) || /[\\/]assets[\\/]supplied[\\/]/.test(file)) continue; // the client's own originals are the platform's to optimise, not the builder's
      const size = statSync(file).size;
      // Declared immersive media (listed in public/assets/immersive/<id>/manifest.json) is judged against its own limits, not the plain image budgets. A file that is only
      // dropped into that folder is not declared, so it gets no exemption.
      const rel = path.relative(root, file).replace(/\\/g, "/");
      const role = declared.get(rel);
      if (role) {
        const limit = role === "frame" ? immersive.frameBytes : role === "cutout" ? immersive.cutoutBytes : role === "mascot" ? immersive.mascotBytes : immersive.posterBytes;
        if (size > limit) findings.push({ file: rel, line: 1, rule: "immersive-budget", message: `${Math.round(size / 1000)} KB is over the ${Math.round(limit / 1000)} KB limit for an immersive ${role}. Make it again with fewer or smaller frames (immersive_make) instead of committing a large file.` });
        continue;
      }
      const hero = /^hero/i.test(path.basename(file));
      const limit = hero ? budget.heroBytes : budget.otherBytes;
      if (size > limit) {
        findings.push({ file: path.relative(root, file), line: 1, rule: "image-budget", message: `${Math.round(size / 1000)} KB is over the ${Math.round(limit / 1000)} KB budget for ${hero ? "the hero" : "an image"}. Ask the platform to optimise it (it writes avif/webp variants) instead of committing a large original.` });
      }
    }
  }
  for (const name of readdirSync(root)) {
    if (/^(?:tailwind|postcss)\.config\./.test(name)) {
      findings.push({ file: name, line: 1, rule: "config", message: "Tailwind v4 is CSS-first. Remove this file; theme lives in src/index.css and src/styles/tokens.css." });
    }
  }
  findings.push(...lintApp(root));
  return findings;
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const findings = lintProject(root);
  const errors = findings.filter((f) => f.severity !== "warn");
  for (const f of findings) console.error(`${f.severity === "warn" ? "warn  " : ""}${f.file}:${f.line}  ${f.rule}  ${f.message}`);
  if (errors.length > 0) {
    console.error(`\n${errors.length} problem(s).`);
    process.exit(1);
  }
  console.log(findings.length > 0 ? `lint: no problems (${findings.length} warning(s))` : "lint: no problems");
}
