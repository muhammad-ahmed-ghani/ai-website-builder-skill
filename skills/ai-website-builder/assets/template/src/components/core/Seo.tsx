import { useLocation } from "react-router";
import { useHead, type HeadData, type MetaTag } from "@/lib/head";
import { getRouterBasename } from "@/lib/base";
import { appConfig } from "@/app.config";

export interface SeoProps {
  /** Page title without the brand ("About"). Omit on the home page to get "Name | tagline". */
  title?: string;
  /** 70-160 characters, written for this page. Required for the build to pass. */
  description: string;
  /** Override the canonical path (default: the current route). */
  path?: string;
  /** Path of a 1200x630 image in public/, default appConfig.ogImage. */
  image?: string;
  type?: "website" | "article";
  /** Keep the page out of search results (and out of sitemap.xml). */
  noindex?: boolean;
  /** Structured data, plain objects such as { "@context": "https://schema.org", "@type": "Organization", ... }. */
  jsonLd?: object | object[];
}

function absolute(pathOrUrl: string): string | undefined {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (!appConfig.url) return undefined;
  const base = getRouterBasename();
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  // The home of a sub-path app is the bare base: object hosts answer ".../base/" with 403, and the router's own home links omit the slash.
  return `${appConfig.url}${base}${base && path === "/" ? "" : path}`;
}

/**
 * Per-route head: title, description, canonical, Open Graph, Twitter and JSON-LD. Renders nothing.
 * Every route component renders exactly one <Seo>. The prerender step fails the build if a route has none.
 */
export function Seo({ title, description, path, image, type = "website", noindex = false, jsonLd }: SeoProps) {
  const { pathname } = useLocation();
  const fullTitle = title ? `${title} | ${appConfig.name}` : `${appConfig.name} | ${appConfig.tagline}`;
  const routePath = path ?? pathname;
  const canonical = noindex ? undefined : absolute(routePath === "/" ? "/" : routePath.replace(/\/+$/, ""));
  const ogImage = image ?? appConfig.ogImage;
  const ogImageUrl = ogImage ? absolute(ogImage) : undefined;

  const meta: MetaTag[] = [
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:site_name", content: appConfig.name },
    { property: "og:locale", content: appConfig.locale },
    { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
  ];
  if (canonical) meta.push({ property: "og:url", content: canonical });
  if (ogImageUrl) {
    meta.push({ property: "og:image", content: ogImageUrl }, { name: "twitter:image", content: ogImageUrl });
  }
  if (appConfig.twitterHandle) meta.push({ name: "twitter:site", content: appConfig.twitterHandle });

  const data: HeadData = {
    title: fullTitle,
    description,
    meta,
    ...(canonical ? { canonical } : {}),
    ...(noindex ? { robots: "noindex, follow" } : {}),
    ...(jsonLd ? { jsonLd: Array.isArray(jsonLd) ? jsonLd : [jsonLd] } : {}),
  };
  useHead(data);
  return null;
}
