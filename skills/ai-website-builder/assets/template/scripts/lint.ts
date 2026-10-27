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
 * Source rules (what a real browser scan cannot see, or what is cheaper to catch in the source; E = error, W = warning):
 *   transition-all:     E  `transition: all` or the transition-all class. List the properties you animate.
 *   animated-layout:    E  a transition on width, height, top or left (W for margin or padding). Animate transform or opacity.
 *   reduced-motion:     E  keyframes, animate-* or transform transitions in src and no prefers-reduced-motion (or motion-reduce:) rule anywhere.
 *   outline-removed:    E  outline removed (outline: none, outline-none, outline-0, outline-hidden) with no focus-visible replacement. tabIndex={-1} targets are exempt.
 *   viewport-width:     E  `width: 100vw`, w-screen, w-[100vw] (scrollbar width makes it overflow). Use 100%.
 *   vh-height:          E  min-h-screen, h-screen or a vh height (a hero must use dvh or svh). The immersive kit is exempt.
 *   overflow-x-hidden:  E  overflow-x hidden on html or body (breaks sticky and fixed). Use overflow-x: clip.
 *   sticky-top-0:       W  two `sticky top-0` elements in one file: the second slides under the first. Offset it.
 *   raw-z-index:        W  z-index of 100 or more as a raw number (z-[9999], z-index: 999). Use the small scale (z-10 ... z-50) or a token.
 *   emoji-icon:         E  an emoji in UI source (tsx and ts outside src/app). Use an icon from the one icon set.
 *   decorative-svg:     W  an <svg> with no aria-hidden, aria-label, role or <title>.
 *   button-type:        W  a <button> with no type (it submits the nearest form). Spread props count as typed.
 *   autoplay-unmuted:   E  a <video> with autoPlay and without muted.
 *   reveal-hidden:      W  a reveal that starts at opacity 0 or visibility hidden with no no-JS or state-attribute guard (content must be visible by default).
 *   fake-send:          W  a form file that prints a success message ("Thanks", "Sent", "You're on the list") and makes no request (fetch, XHR, sendBeacon, submit, submitForm ...).
 *   copy-*:             the copy-tell pass over text in src/pages, src/sections and app.config.ts, read from scripts/copy-tells.json (absent file = pass skipped).
 *                       residue, placeholders and patterns marked "error" (dashes, invented proof) are errors; words, phrases and the other patterns are warnings.
 *                       Rule ids: copy-residue, copy-placeholder, copy-word, copy-phrase, copy-<pattern id>. A file whose header comment says PLACEHOLDER (an unwritten starter stub) is skipped.
 * Severity tiers: an error fails the build (exit 1). A warning is printed and never fails; look at each one and fix it or waive it.
 * Waivers: a comment `lint-ok: <rule-id> <reason>` on the line, or on the line above, silences that rule there. The reason is required and
 * should name this app (a waiver with no reason is itself a warning, `lint-waiver`; one that silences nothing is `lint-waiver-unused`).
 *   In a .ts file: `const mark = "x"; // lint-ok: emoji-icon the owner's wordmark is an emoji`. In JSX use a block comment in braces with the same text.
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
  findings.push(...lintSourceRules(file, content));
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

// ------------------------------------------------------------------------------------------------ source rules, copy and waivers

const err = (file: string, line: number, rule: string, message: string): Finding => ({ file, line, rule, message, severity: "error" });
const wrn = (file: string, line: number, rule: string, message: string): Finding => ({ file, line, rule, message, severity: "warn" });

/** Every string literal ("...", '...', `...`) with the index of its first character. */
function stringLiterals(code: string): Array<{ text: string; index: number }> {
  const out: Array<{ text: string; index: number }> = [];
  for (const m of code.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)) out.push({ text: m[1] ?? m[2] ?? m[3] ?? "", index: m.index ?? 0 });
  return out;
}

/** The opening tag that starts at `start` (`<button ...>`), with quotes and braces balanced so `=>` or `>` inside an attribute does not end it. */
function openingTag(code: string, start: number): string {
  let depth = 0;
  let quote = "";
  for (let i = start; i < code.length; i++) {
    const c = code.charAt(i);
    if (quote) {
      if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth <= 0) return code.slice(start, i + 1);
  }
  return code.slice(start, start + 400);
}

/** The `selector { body }` blocks of a stylesheet (innermost blocks only; at-rules that wrap other blocks are skipped). */
function cssBlocks(code: string): Array<{ selector: string; body: string; index: number }> {
  const out: Array<{ selector: string; body: string; index: number }> = [];
  for (const m of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (m[1] ?? "").split(";").pop()?.trim() ?? "";
    out.push({ selector, body: m[2] ?? "", index: (m.index ?? 0) + (m[1] ?? "").length - (m[1] ?? "").trimStart().length });
  }
  return out;
}

const looksLikeClasses = (text: string): boolean => {
  const tokens = text.trim().split(/\s+/);
  const hits = tokens.filter((t) => /^[!-]?[\w[\]().\/%#&:>*-]+$/.test(t) && (/[-:[\]/]/.test(t) || /^(?:flex|grid|block|inline|hidden|relative|absolute|fixed|sticky|static|truncate|italic|underline|uppercase|lowercase|border|rounded|shadow|container|transition|group|peer|invisible|visible|contents)$/.test(t)));
  return tokens.length >= 2 && hits.length >= tokens.length * 0.6;
};

/** The words a visitor reads: JSX text and prose-looking string literals (not class lists, import paths or identifiers). */
function copyStrings(code: string): Array<{ text: string; index: number }> {
  const out: Array<{ text: string; index: number }> = [];
  for (const m of code.matchAll(/(?<![=\-])>([^<>{}]*[A-Za-z][^<>{}]*)</g)) {
    const raw = m[1] ?? "";
    out.push({ text: raw.trim(), index: (m.index ?? 0) + 1 + raw.length - raw.trimStart().length });
  }
  for (const lit of stringLiterals(code)) {
    const text = lit.text.trim();
    if (text.length < 4 || !/\s/.test(text) || looksLikeClasses(text)) continue;
    const before = code.slice(Math.max(0, lit.index - 14), lit.index);
    if (/(?:className|class|from|import)\s*=?\s*$/.test(before) || /(?:cn|cva|clsx|twMerge)\(\s*$/.test(before)) continue;
    out.push({ text, index: lit.index + 1 });
  }
  return out;
}

const SUCCESS_WORDS = /\b(?:sent|thanks|thank you|reserved|booked|on the list|subscribed|in touch|received|confirmed|ordered|signed up|all set|you're in|you are in)\b/i;
const NEGATION = /\b(?:not|nothing|no|never|isn't|wasn't|didn't|cannot|can't|failed|try again|soon)\b/i;
const REQUEST_CALL = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|\.submit\s*\(|\baxios\b|\bsubmitForm\b|\bpostForm\b|\bsendOptimistic\b|\bstore\.\w+\s*\(|\.mutate\s*\(|\buseAiJob\b/;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{26FF}\u{2700}-\u{2712}\u{2719}-\u{27BF}\u{2B50}\u{2B55}]/u;
const FOCUS_REPLACEMENT = /(?:focus-visible|focus-within|focus):(?:ring|shadow|border|outline-(?!none|hidden|0(?![\w-])|offset)|bg-|underline|text-|inset)/;
const REVEAL_SELECTOR = /reveal|appear|fade-?in|scroll-?in|animate-in|in-?view/i;
const REVEAL_GUARD = /state|\.js\b|:hover|:focus|\[hidden|:not\(|aria-|\[open|:checked|:target|:popover|data-(?:hydrated|ready|mounted|js)/i;

/**
 * The source-level rules: what a browser scan cannot see (a transition list, a missing media query) or what is cheaper to catch before a build.
 * Comments are blanked first, so prose that mentions `transition: all` is not linted. Line numbers are those of the original file.
 */
export function lintSourceRules(file: string, content: string): Finding[] {
  const out: Finding[] = [];
  const code = stripComments(content);
  const norm = file.replace(/\\/g, "/");
  const isCss = norm.endsWith(".css");
  const isTs = /\.tsx?$/.test(norm);
  const at = (index: number | undefined) => lineOf(code, index);
  const immersive = /(?:^|\/)components\/immersive\//.test(norm);

  // transition-all, animated-layout
  for (const m of code.matchAll(/(?<![\w-])transition-all(?![\w-])/g)) out.push(err(file, at(m.index), "transition-all", "transition-all animates every property, including layout. List what changes (transition-colors, transition-opacity, transition-transform)."));
  const checkProps = (list: string[], index: number | undefined) => {
    for (const raw of list) {
      const prop = raw.trim().split(/\s+/)[0]?.replace(/^["'`]|["'`]$/g, "") ?? "";
      if (prop === "all") out.push(err(file, at(index), "transition-all", "`transition: all` animates every property, including layout. List the properties that change."));
      else if (/^(?:width|height|top|left)$/.test(prop)) out.push(err(file, at(index), "animated-layout", `Transitioning ${prop} reflows the page on every frame. Animate transform or opacity instead.`));
      else if (/^(?:margin|padding)(?:-[a-z]+)*$/.test(prop)) out.push(wrn(file, at(index), "animated-layout", `Transitioning ${prop} reflows the page on every frame. Prefer transform, unless the outer height never changes.`));
    }
  };
  for (const m of code.matchAll(/(?<![\w-])transition(?:-property)?\s*:\s*([^;{}]+)/g)) checkProps((m[1] ?? "").split(","), m.index);
  for (const m of code.matchAll(/(?<![\w-])transition-\[([^\]]+)\]/g)) checkProps((m[1] ?? "").split(","), m.index);

  // outline-removed
  if (isCss) {
    const ring = /:focus-visible[^{}]*\{[^{}]*(?:outline|box-shadow|border)/.test(code);
    for (const rule of cssBlocks(code)) {
      if (!/(?<![\w-])outline(?:-style)?\s*:\s*(?:none|0)(?![\w.-])/.test(rule.body)) continue;
      if (ring || /:focus-visible|tabindex\s*=\s*["']?-1/i.test(rule.selector)) continue;
      out.push(err(file, at(rule.index), "outline-removed", `The outline is removed on "${rule.selector.slice(0, 40)}" and nothing replaces it. Keyboard users lose their place: add a :focus-visible ring.`));
    }
  }
  if (isTs) {
    for (const lit of stringLiterals(code)) {
      const m = /(?<![\w-])(?:[a-z-]+:)*outline-(?:none|hidden|0)(?![\w-])/.exec(lit.text);
      if (!m || FOCUS_REPLACEMENT.test(lit.text)) continue;
      const start = code.lastIndexOf("<", lit.index);
      const tag = start >= 0 ? openingTag(code, start) : "";
      if (/tabIndex=\{-1\}/.test(tag) || /^<[\w.]*Viewport\b/.test(tag)) continue; // a programmatic focus target (the main landmark) shows no ring on purpose
      out.push(err(file, at(lit.index), "outline-removed", `"${m[0]}" removes the focus outline and nothing replaces it. Add focus-visible:ring-2 (or another visible focus style) in the same class list.`));
    }
    for (const m of code.matchAll(/(?<![\w-])outline\s*:\s*["']?(?:none|0)["']?/g)) {
      if (!/focus/i.test(code.slice(Math.max(0, (m.index ?? 0) - 120), (m.index ?? 0) + 120))) out.push(err(file, at(m.index), "outline-removed", "An inline outline: none removes the focus ring. Style :focus-visible instead."));
    }
  }

  // viewport-width, vh-height
  for (const m of code.matchAll(/(?<![\w-])(?:min-|max-)?(?:width|inline-size)\s*:\s*[^;{}]*\b100vw\b/g)) out.push(err(file, at(m.index), "viewport-width", "100vw includes the scrollbar and makes the page scroll sideways. Use 100% (or w-full)."));
  for (const m of code.matchAll(/(?<![\w-])(?:min-|max-)?w-screen(?![\w-])|(?<![\w-])(?:min-|max-)?w-\[100vw\]/g)) out.push(err(file, at(m.index), "viewport-width", `${m[0]} is 100vw: it includes the scrollbar and makes the page scroll sideways. Use w-full.`));
  if (!immersive) {
    for (const m of code.matchAll(/(?<![\w-])(?:min-)?h-screen(?![\w-])|(?<![\w-])(?:min-|max-)?h-\[\d+(?:\.\d+)?vh\]/g)) out.push(err(file, at(m.index), "vh-height", `${m[0]} is sized in vh, which ignores the phone's moving address bar. Use min-h-dvh or min-h-svh.`));
    for (const m of code.matchAll(/(?<![\w-])(?:min-|max-)?(?:height|block-size)\s*:\s*[^;{}]*\b\d+(?:\.\d+)?vh\b/g)) out.push(err(file, at(m.index), "vh-height", "A height in vh ignores the phone's moving address bar. Use dvh or svh."));
  }

  // overflow-x-hidden (on html or body)
  if (isCss) {
    for (const rule of cssBlocks(code)) {
      const parts = rule.selector.split(",").map((p) => p.trim().toLowerCase());
      if (!parts.some((p) => /^(?:html|body|:root|html\s+body)$/.test(p))) continue;
      if (/overflow-x\s*:\s*hidden/.test(rule.body) || /@apply[^;]*overflow-x-hidden/.test(rule.body)) out.push(err(file, at(rule.index), "overflow-x-hidden", "overflow-x: hidden on html or body breaks position: sticky and fixed and hides the real overflow. Find the wide element, and use overflow-x: clip if you must."));
    }
  }
  if (isTs) for (const m of code.matchAll(/document\.(?:body|documentElement)\.style\.overflowX\s*=\s*["']hidden/g)) out.push(err(file, at(m.index), "overflow-x-hidden", "overflow-x: hidden on html or body breaks position: sticky and fixed. Use overflow-x: clip."));

  // sticky-top-0 (two in one file)
  const sticky: number[] = [];
  if (isTs) for (const lit of stringLiterals(code)) if (/(?<![\w:-])sticky(?![\w-])/.test(lit.text) && /(?<![\w:-])top-0(?![\w-])/.test(lit.text)) sticky.push(lit.index);
  if (isCss) for (const rule of cssBlocks(code)) if (/position\s*:\s*sticky/.test(rule.body) && /(?<![\w-])top\s*:\s*0(?:px)?\s*(?:;|$)/.test(rule.body.trim())) sticky.push(rule.index);
  if (sticky.length >= 2) out.push(wrn(file, at(sticky[1]), "sticky-top-0", `Two sticky top-0 elements in this file (first at line ${at(sticky[0])}). The second slides under the first: offset it by the first one's height.`));

  // raw-z-index
  for (const m of code.matchAll(/(?<![\w-])z-\[(\d+)\]|(?<![\w-])z-index\s*:\s*(\d+)|(?<![\w-])zIndex\s*:\s*(\d+)/g)) {
    if (Number(m[1] ?? m[2] ?? m[3]) >= 100) out.push(wrn(file, at(m.index), "raw-z-index", `A raw z-index of ${m[1] ?? m[2] ?? m[3]} starts a stacking arms race. Use the small scale (z-10 to z-50) or a named token.`));
  }

  // emoji-icon (UI source only: demo data in src/app/ may contain emoji on purpose)
  if (isTs && !/(?:^|\/)src\/app\//.test(norm)) {
    const seen = new Set<number>();
    for (const m of code.matchAll(new RegExp(EMOJI.source, "gu"))) {
      const line = at(m.index);
      if (seen.has(line)) continue;
      seen.add(line);
      out.push(err(file, line, "emoji-icon", "An emoji in the interface source. Emoji render differently on every platform and read as a template: use one drawn icon set (lucide-react) at one stroke weight."));
    }
  }

  if (/\.tsx$/.test(norm)) {
    // decorative-svg
    for (const m of code.matchAll(/<svg\b/g)) {
      const start = m.index ?? 0;
      const tag = openingTag(code, start);
      const inner = code.slice(start, start + 1500).split("</svg>")[0] ?? "";
      if (!/aria-hidden|aria-label|aria-labelledby|\brole\s*=|\{\s*\.\.\./.test(tag) && !/<title\b/.test(inner)) out.push(wrn(file, at(start), "decorative-svg", "An <svg> with no aria-hidden, label, role or <title>. Hide a decorative one (aria-hidden=\"true\") or name a meaningful one."));
    }
    // button-type
    for (const m of code.matchAll(/<button\b/g)) {
      const tag = openingTag(code, m.index ?? 0);
      if (!/\btype\s*=/.test(tag) && !/\{\s*\.\.\./.test(tag)) out.push(wrn(file, at(m.index), "button-type", "A <button> with no type submits the nearest form. Say type=\"button\" (or \"submit\")."));
    }
    // autoplay-unmuted
    for (const m of code.matchAll(/<video\b/g)) {
      const tag = openingTag(code, m.index ?? 0);
      if (/\bautoPlay\b|\bautoplay\b/.test(tag) && (!/\bmuted\b/.test(tag) || /muted=\{false\}/.test(tag))) out.push(err(file, at(m.index), "autoplay-unmuted", "A video that autoplays must be muted: browsers block it otherwise and people hate the sound. Add muted (and playsInline)."));
    }
  }

  // reveal-hidden
  if (isCss) {
    for (const rule of cssBlocks(code)) {
      if (!REVEAL_SELECTOR.test(rule.selector) || REVEAL_GUARD.test(rule.selector)) continue;
      if (!/(?<![\w-])opacity\s*:\s*0\s*(?:;|$)|visibility\s*:\s*hidden/.test(rule.body.trim()) || /@starting-style/.test(code.slice(Math.max(0, rule.index - 80), rule.index))) continue;
      out.push(wrn(file, at(rule.index), "reveal-hidden", `"${rule.selector.slice(0, 40)}" starts content at opacity 0 or hidden with no state attribute set by script. If the script fails the content stays invisible: hide only after a script sets a state, or animate from visible.`));
    }
  }
  if (isTs && /IntersectionObserver|useInView|\binView\b|useScroll|onScroll|\brevealed\b|\bisVisible\b/.test(code)) {
    for (const lit of stringLiterals(code)) {
      const m = /(?<![\w:[-])(?:opacity-0|invisible)(?![\w-])/.exec(lit.text);
      if (m) out.push(wrn(file, at(lit.index), "reveal-hidden", `"${m[0]}" with no variant hides this element from the first paint and relies on script to show it. Start visible, or hide only behind a state attribute the script sets (see components/core/Reveal.tsx).`));
    }
    for (const m of code.matchAll(/\.style\.(?:opacity\s*=\s*["']?0["']?|visibility\s*=\s*["']hidden)/g)) out.push(wrn(file, at(m.index), "reveal-hidden", "Script hides an element by inline style. If the script stops, the content stays hidden: set a state attribute that CSS reacts to, and keep the default visible."));
  }

  // fake-send
  if (isTs && /<form\b|\bonSubmit\s*=|type=["']submit["']/.test(code) && !REQUEST_CALL.test(code)) {
    const hit = copyStrings(code).find((s) => s.text.split(/\s+/).length >= 2 && SUCCESS_WORDS.test(s.text.split(/\s+/).slice(0, 4).join(" ")) && !NEGATION.test(s.text));
    if (hit) out.push(wrn(file, at(hit.index), "fake-send", `This form file prints "${hit.text.slice(0, 40)}" but makes no request (no fetch, XHR, sendBeacon or submit). A success message with nothing sent is a lie: post to a real endpoint first, and show success only after it answers.`));
  }
  return out;
}

export interface CopyRule {
  id: string;
  re: RegExp;
  severity: "error" | "warn";
  message: string;
}

/** The copy tells in scripts/copy-tells.json (`residue`, `placeholders`, `words`, `phrases` as lists; `patterns` as {id, regex, flags, severity, note}). A missing or broken file means no copy pass. */
export function readCopyRules(root: string): CopyRule[] {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(readFileSync(path.join(root, "scripts", "copy-tells.json"), "utf8")) as Record<string, unknown>;
  } catch {
    return [];
  }
  const rules: CopyRule[] = [];
  const escape = (s: string) => s.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const list = (key: string, id: string, severity: "error" | "warn", what: string) => {
    const items = (Array.isArray(json[key]) ? (json[key] as unknown[]) : []).filter((s): s is string => typeof s === "string" && s.trim().length > 0);
    if (items.length === 0) return;
    const body = items.sort((a, b) => b.length - a.length).map(escape).join("|");
    rules.push({ id, re: new RegExp(`(?<![\\w])(?:${body})(?![\\w])`, "giu"), severity, message: what });
  };
  list("residue", "copy-residue", "error", "Leftover from a chat reply, not copy");
  list("placeholders", "copy-placeholder", "error", "Placeholder text");
  list("words", "copy-word", "warn", "A word that signals generated copy");
  list("phrases", "copy-phrase", "warn", "A phrase that signals generated copy");
  for (const p of Array.isArray(json.patterns) ? (json.patterns as unknown[]) : []) {
    const o = p as { id?: unknown; regex?: unknown; flags?: unknown; severity?: unknown; note?: unknown };
    if (typeof o.regex !== "string" || typeof o.id !== "string") continue;
    const flags = typeof o.flags === "string" ? o.flags : "i";
    try {
      rules.push({ id: `copy-${o.id}`, re: new RegExp(o.regex, flags.includes("g") ? flags : `${flags}g`), severity: o.severity === "error" ? "error" : "warn", message: typeof o.note === "string" ? o.note : "A copy tell" });
    } catch {
      /* an unreadable pattern is skipped, the rest still run */
    }
  }
  return rules;
}

/** The copy pass over one file's text. Only called for files whose words a visitor reads. */
export function lintCopy(file: string, content: string, rules: CopyRule[]): Finding[] {
  const out: Finding[] = [];
  if (/\/\*\*[^]{0,300}?\bPLACEHOLDER\b/.test(content.slice(0, 800))) return out; // an unwritten starter stub (its header says PLACEHOLDER): the stub's own "Replace me" is not copy yet
  const code = stripComments(content);
  const seen = new Set<string>();
  for (const s of copyStrings(code)) {
    for (const rule of rules) {
      for (const m of s.text.matchAll(rule.re)) {
        const line = lineOf(code, s.index + (m.index ?? 0));
        const key = `${line}|${rule.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ file, line, rule: rule.id, severity: rule.severity, message: `${rule.message}: "${m[0].trim().slice(0, 50)}". Say the specific thing in the owner's words.` });
      }
    }
  }
  return out;
}

const COPY_SCOPE = /^src\/(?:pages|sections)\/.*\.tsx$|^src\/app\.config\.ts$/;

/** Motion with no way to turn it off: keyframes, animate-* or transform transitions anywhere in src and no prefers-reduced-motion (or motion-reduce:) rule anywhere in src. */
function lintReducedMotion(sources: Map<string, string>): Finding[] {
  let first: { file: string; line: number } | null = null;
  let honoured = false;
  const MOTION = /@keyframes|(?<![\w-])animate-(?!none)[a-z]|(?<![\w-])animation\s*:\s*(?!none)|(?<![\w-])transition-(?:transform|all)|(?<![\w-])transition-\[[^\]]*(?:transform|translate|scale|rotate)|(?<![\w-])transition(?:-property)?\s*:[^;{}]*(?:transform|translate|scale|rotate)/;
  for (const [file, content] of sources) {
    const code = stripComments(content);
    if (/prefers-reduced-motion|motion-reduce:|motion-safe:/.test(code)) honoured = true;
    const m = MOTION.exec(code);
    if (m && !first) first = { file, line: lineOf(code, m.index) };
  }
  if (!first || honoured) return [];
  return [err(first.file, first.line, "reduced-motion", "The app animates but nothing honours prefers-reduced-motion. Add a @media (prefers-reduced-motion: reduce) block that stops animations and transitions (the starter's index.css has one).")];
}

interface Waiver {
  line: number;
  rule: string;
  reason: string;
  used: boolean;
}

/** `lint-ok: <rule-id> <reason>` comments, with the line each is on. */
function waiversIn(content: string): Waiver[] {
  const out: Waiver[] = [];
  content.split("\n").forEach((text, i) => {
    const m = /lint-ok:\s*([a-z0-9-]+)(.*)$/i.exec(text);
    if (!m) return;
    const reason = (m[2] ?? "").replace(/\*\/.*$|-->.*$|\}\s*$/, "").trim();
    out.push({ line: i + 1, rule: (m[1] ?? "").toLowerCase(), reason, used: false });
  });
  return out;
}

/** Drop findings silenced by a waiver on their line or the line above; add warnings for waivers with no reason or no target. */
export function applyWaivers(findings: Finding[], sources: Map<string, string>): Finding[] {
  const byFile = new Map<string, Waiver[]>();
  for (const [file, content] of sources) {
    const list = waiversIn(content);
    if (list.length > 0) byFile.set(file, list);
  }
  const kept = findings.filter((f) => {
    const hit = (byFile.get(f.file) ?? []).find((w) => w.rule === f.rule.toLowerCase() && (w.line === f.line || w.line === f.line - 1));
    if (hit) hit.used = true;
    return !hit;
  });
  for (const [file, list] of byFile) {
    for (const w of list) {
      if (w.reason.length < 3) kept.push(wrn(file, w.line, "lint-waiver", `lint-ok: ${w.rule} has no reason. Say why this exception is right for this app.`));
      else if (!w.used) kept.push(wrn(file, w.line, "lint-waiver-unused", `lint-ok: ${w.rule} silences nothing here. Remove it.`));
    }
  }
  return kept;
}

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
  const sources = new Map<string, string>();
  if (existsSync(src)) {
    const copyRules = readCopyRules(root);
    for (const file of walk(src)) {
      const rel = path.relative(root, file).replace(/\\/g, "/");
      const content = readFileSync(file, "utf8");
      sources.set(rel, content);
      findings.push(...lintFileContent(rel, content));
      if (copyRules.length > 0 && COPY_SCOPE.test(rel)) findings.push(...lintCopy(rel, content, copyRules));
    }
    findings.push(...lintReducedMotion(sources));
  }
  const indexHtml = path.join(root, "index.html");
  if (existsSync(indexHtml) && /<(?:html|body)\b[^>]*\boverflow-x-hidden\b/.test(readFileSync(indexHtml, "utf8"))) {
    findings.push(err("index.html", 1, "overflow-x-hidden", "overflow-x-hidden on html or body breaks position: sticky and fixed. Find the wide element, and use overflow-x: clip if you must."));
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
  return applyWaivers(findings, sources);
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const findings = lintProject(root);
  const errors = findings.filter((f) => f.severity !== "warn");
  const warnings = findings.length - errors.length;
  for (const f of findings) console.error(`${f.severity === "warn" ? "warn  " : ""}${f.file}:${f.line}  ${f.rule}  ${f.message}`);
  if (errors.length > 0) {
    console.error(`\nlint: ${errors.length} error(s), ${warnings} warning(s). Errors fail the build; warnings never do.`);
    process.exit(1);
  }
  console.log(warnings > 0 ? `lint: 0 errors, ${warnings} warning(s) (warnings never fail the build; fix each or waive it with lint-ok: <rule> <reason>)` : "lint: no problems");
}
