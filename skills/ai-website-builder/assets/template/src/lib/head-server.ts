import type { HeadData } from "./head";

/** Prerender only: serialise HeadData into HTML (never imported by the browser entry). */

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function tag(name: string, attrs: Record<string, string>): string {
  const rendered = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(" ");
  return `<${name} ${rendered} data-seo>`;
}

/** Everything except <title>, which the prerender step swaps in place. */
export function renderHeadTags(data: HeadData): string {
  const out: string[] = [];
  if (data.description !== undefined) out.push(tag("meta", { name: "description", content: data.description }));
  if (data.canonical) out.push(tag("link", { rel: "canonical", href: data.canonical }));
  if (data.robots) out.push(tag("meta", { name: "robots", content: data.robots }));
  for (const m of data.meta ?? []) {
    out.push(tag("meta", m.property ? { property: m.property, content: m.content } : { name: m.name ?? "", content: m.content }));
  }
  for (const ld of data.jsonLd ?? []) {
    // "<" is escaped so a string value can never close the script element
    const json = JSON.stringify(ld).replace(/</g, "\\u003c");
    out.push(`<script type="application/ld+json" data-seo>${json}</script>`);
  }
  return out.join("\n    ");
}
