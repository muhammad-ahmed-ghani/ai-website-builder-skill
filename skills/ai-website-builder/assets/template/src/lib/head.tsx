import { createContext, useContext, useEffect, type ReactNode } from "react";

/*
 * Tiny head manager (no dependency). Pages describe their head through <Seo> (components/core/Seo.tsx),
 * which calls useHead().
 *  - at prerender time a HeadProvider collects the data so scripts/prerender.ts can write real tags into the HTML
 *  - in the browser an effect keeps <title> and the managed <meta>/<link>/<script> tags in sync on navigation
 * Managed tags carry data-seo so they can be replaced without touching anything else in <head>.
 */

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface HeadData {
  title: string;
  description?: string;
  /** Absolute canonical URL (omitted when VITE_APP_URL is not set). */
  canonical?: string;
  /** For example "noindex, follow". */
  robots?: string;
  /** Open Graph and Twitter tags. */
  meta?: MetaTag[];
  /** Plain JSON-LD objects, one script tag each. */
  jsonLd?: object[];
}

export interface HeadCollector {
  data: HeadData | null;
}

const HeadContext = createContext<HeadCollector | null>(null);

/** Used by the prerender entry only. The browser never mounts a provider. */
export function HeadProvider({ collector, children }: { collector: HeadCollector; children: ReactNode }) {
  return <HeadContext.Provider value={collector}>{children}</HeadContext.Provider>;
}

export function useHead(data: HeadData): void {
  const collector = useContext(HeadContext);
  if (collector) collector.data = data; // server pass: record, render nothing
  const key = JSON.stringify(data);
  useEffect(() => {
    applyHead(JSON.parse(key) as HeadData);
  }, [key]);
}

/** Browser side: reconcile document.head with the page's HeadData. */
export function applyHead(data: HeadData): void {
  document.title = data.title;

  for (const el of document.head.querySelectorAll("[data-seo]")) el.remove();

  const add = (tag: string, attrs: Record<string, string>, text?: string) => {
    const el = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
    el.setAttribute("data-seo", "");
    if (text) el.textContent = text;
    document.head.appendChild(el);
  };

  // The static index.html carries a fallback description; keep it unless the page provides one.
  if (data.description !== undefined) {
    const fallback = document.head.querySelector<HTMLMetaElement>('meta[name="description"]:not([data-seo])');
    fallback?.remove();
    add("meta", { name: "description", content: data.description });
  }
  if (data.canonical) add("link", { rel: "canonical", href: data.canonical });
  if (data.robots) add("meta", { name: "robots", content: data.robots });
  for (const m of data.meta ?? []) {
    add("meta", m.property ? { property: m.property, content: m.content } : { name: m.name ?? "", content: m.content });
  }
  for (const ld of data.jsonLd ?? []) add("script", { type: "application/ld+json" }, JSON.stringify(ld));
}
