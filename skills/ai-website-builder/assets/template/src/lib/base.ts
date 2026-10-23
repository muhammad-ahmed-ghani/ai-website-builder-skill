/**
 * Router basename derived from Vite's base. "/" and "./" mean the app lives at the domain root.
 * A path base such as "/preview/abc/" becomes the basename "/preview/abc".
 */
export function getRouterBasename(base: string = import.meta.env.BASE_URL): string {
  if (!base.startsWith("/")) return "";
  return base.replace(/\/+$/, "");
}

/** Prefix a root-relative public path ("/assets/hero.webp") with the base path when the app is served from a sub-path. */
export function withBase(publicPath: string, base: string = import.meta.env.BASE_URL): string {
  const prefix = getRouterBasename(base);
  if (!prefix || !publicPath.startsWith("/") || publicPath.startsWith("//")) return publicPath;
  return `${prefix}${publicPath}`;
}

/**
 * Static object hosts (Cloudflare R2, S3) have no directory index, so the only URL they can serve for the home page of a
 * published app is the literal file, ".../index.html", and for /about it is ".../about/index.html". The router only
 * knows "/" and "/about", so fold the file URL onto the page URL before the router reads the location. The published
 * app stores each page under that pretty key too, so reloading the folded URL works. A no-op on every other host.
 */
export function foldIndexFileUrl(loc: Pick<Location, "pathname" | "search" | "hash"> = window.location, hist: Pick<History, "state" | "replaceState"> = window.history): void {
  const m = /^(.*)\/index\.html$/.exec(loc.pathname);
  if (!m) return;
  hist.replaceState(hist.state, "", `${m[1] || "/"}${loc.search}${loc.hash}`);
}
