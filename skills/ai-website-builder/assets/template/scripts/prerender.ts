/**
 * Static prerender (SSG). Platform-owned; do not edit per app.
 *
 * Runs after the client build and the SSR build (see the "build" script):
 *   dist/index.html            client build output, used as the HTML template
 *   .ssr/entry-server.js       src/entry-server.tsx bundled for Node
 *
 * For every static route in src/routes.tsx it renders the real React tree with react-dom/server and writes
 *   dist/index.html, dist/<route>/index.html, dist/404.html
 * each with its own <title>, meta description, canonical, Open Graph tags and JSON-LD, then generates
 * dist/sitemap.xml and dist/robots.txt from the same route list. The browser entry hydrates the markup with hydrateRoot.
 *
 * The build fails (instead of shipping a weak page) when a route has no <Seo>, no title or description, not exactly
 * one <h1>, or an <img> without alt.
 *
 * Node runs this file directly (type stripping): keep it free of enums, namespaces and parameter properties.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.NODE_ENV = "production";

type ServerEntry = typeof import("../src/entry-server.tsx");

const root = path.resolve(import.meta.dirname, "..");
const distDir = path.join(root, "dist");
const ssrDir = path.join(root, ".ssr");
const base = process.env.VITE_BASE || "/";
const basename = base.startsWith("/") ? base.replace(/\/+$/, "") : "";

const errors: string[] = [];
const warnings: string[] = [];

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function normalisePath(p: string): string {
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  return withSlash === "/" ? "/" : withSlash.replace(/\/+$/, "");
}

/** Replace a marker comment, or (when the build stripped it) the fallback pattern. Function replacers: content may contain "$". */
function inject(html: string, marker: string, fallback: RegExp, content: (match: string) => string): string {
  if (html.includes(marker)) return html.replace(marker, () => content(marker));
  if (fallback.test(html)) return html.replace(fallback, (match) => content(match));
  throw new Error(`index.html has neither ${marker} nor a fallback anchor (${fallback}).`);
}

function assemble(template: string, entry: ServerEntry, route: string, depth: number): { html: string; title: string; robots: string } {
  const { html: markup, head, headTags } = entry.render(route);
  if (!head) {
    throw new Error(`Route ${route} rendered no <Seo>. Every page component must render exactly one <Seo title description />.`);
  }
  if (!head.title.trim()) errors.push(`${route}: empty <title>`);
  if (!head.description?.trim()) errors.push(`${route}: missing meta description`);
  else if (head.description.length < 50 || head.description.length > 175) {
    warnings.push(`${route}: description is ${head.description.length} characters (aim for 70-160)`);
  }
  const h1Count = (markup.match(/<h1[\s>]/g) ?? []).length;
  if (h1Count !== 1) errors.push(`${route}: expected exactly one <h1>, found ${h1Count}`);
  const imgWithoutAlt = (markup.match(/<img\b(?![^>]*\balt=)[^>]*>/g) ?? []).length;
  if (imgWithoutAlt > 0) errors.push(`${route}: ${imgWithoutAlt} <img> without an alt attribute`);

  let out = template;
  out = out.replace(/<html lang="[^"]*"(?: dir="[^"]*")?/, () => `<html lang="${escapeHtml(entry.appConfig.lang)}" dir="${entry.appConfig.dir === "rtl" ? "rtl" : "ltr"}"`);
  out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(head.title)}</title>`);
  out = out.replace(/\s*<meta name="description"[^>]*>/, ""); // the fallback; Seo's own tag is injected below
  out = inject(out, "<!--app-head-->", /<\/head>/, (m) => (m === "</head>" ? `${headTags}\n  </head>` : headTags));
  out = inject(out, "<!--app-html-->", /<div id="root">\s*<\/div>/, (m) =>
    m.startsWith("<div") ? `<div id="root">${markup}</div>` : markup,
  );
  if (!base.startsWith("/") && depth > 0) {
    // relative base ("./"): nested pages must climb back to the root for assets
    out = out.replace(/(href|src)="\.\//g, (_m, attr: string) => `${attr}="${"../".repeat(depth)}`);
  }
  return { html: out, title: head.title, robots: head.robots ?? "" };
}

async function main() {
  const startedAt = Date.now();
  const template = await readFile(path.join(distDir, "index.html"), "utf8");
  const entry = (await import(pathToFileURL(path.join(ssrDir, "entry-server.js")).href)) as ServerEntry;

  const targets = new Set<string>();
  for (const route of entry.routes) {
    if (route.prerender === false) continue;
    const dynamic = /[:*]/.test(route.path);
    if (!dynamic) targets.add(normalisePath(route.path));
    for (const extra of route.paths ?? []) targets.add(normalisePath(extra));
    if (dynamic && !(route.paths?.length)) {
      warnings.push(`${route.path}: parameterised route has no "paths", it is client-rendered only`);
    }
  }
  if (targets.size === 0) throw new Error("src/routes.tsx has no prerenderable routes.");

  const written: Array<{ route: string; file: string; title: string; indexable: boolean }> = [];
  for (const route of [...targets].sort()) {
    const depth = route === "/" ? 0 : route.split("/").filter(Boolean).length;
    const { html, title, robots } = assemble(template, entry, route, depth);
    const file = route === "/" ? path.join(distDir, "index.html") : path.join(distDir, ...route.split("/").filter(Boolean), "index.html");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, html);
    written.push({ route, file: path.relative(root, file), title, indexable: !/noindex/i.test(robots) });
  }

  // 404.html: the NotFound page, for static hosts that serve a custom error document
  const notFound = assemble(template, entry, "/__not-found__", 0);
  await writeFile(path.join(distDir, "404.html"), notFound.html);

  const titles = new Map<string, string[]>();
  for (const page of written) titles.set(page.title, [...(titles.get(page.title) ?? []), page.route]);
  for (const [title, routes] of titles) {
    if (routes.length > 1) warnings.push(`duplicate <title> "${title}" on ${routes.join(", ")}`);
  }

  // sitemap.xml and robots.txt from the same route list
  const appUrl = entry.appConfig.url;
  if (!appUrl) {
    warnings.push("VITE_APP_URL is not set: sitemap.xml uses https://example.com and canonical/og:url are omitted. Set it before publishing.");
  }
  const origin = appUrl || "https://example.com";
  const urls = written
    .filter((page) => page.indexable)
    .map((page) => `  <url><loc>${escapeHtml(`${origin}${basename}${page.route === "/" ? (basename ? "" : "/") : page.route}`)}</loc></url>`);
  await writeFile(
    path.join(distDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
  );
  const robots = ["User-agent: *", "Allow: /", ...(appUrl ? ["", `Sitemap: ${origin}${basename}/sitemap.xml`] : [])];
  await writeFile(path.join(distDir, "robots.txt"), `${robots.join("\n")}\n`);

  for (const warning of warnings) console.warn(`prerender: warning: ${warning}`);
  if (errors.length > 0) {
    for (const error of errors) console.error(`prerender: error: ${error}`);
    throw new Error(`prerender failed with ${errors.length} error(s)`);
  }

  if (!process.env.KEEP_SSR) await rm(ssrDir, { recursive: true, force: true });
  console.log(`prerender: ${written.length} route(s) + 404.html + sitemap.xml + robots.txt in ${Date.now() - startedAt} ms`);
  for (const page of written) console.log(`  ${page.route.padEnd(24)} ${page.file}  "${page.title}"`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
