/**
 * App-level facts used by the layout, SEO and the prerender step. Edit the values, keep the shape.
 * Never invent facts here: no fake awards, press logos, ratings or customer counts.
 */

export interface NavItem {
  label: string;
  /** Internal path ("/about", "/#pricing"), "mailto:" / "tel:" or an absolute URL. */
  to: string;
}

export const appConfig = {
  /**
   * "pages" = a marketing or content app (header, footer, one <main> per page). "app" = a working application: `/` IS the app, routes
   * default to no app chrome and render the app kit (AppShell, AuthGate). Set by the platform from the brief. AGENTS.md section 14.
   */
  kind: "pages" as "pages" | "app",
  /** Brand name. Shown in the header, the title template and og:site_name. */
  name: "Your App",
  /** Short line used in the home page title ("Your App | tagline"). */
  tagline: "Replace the tagline",
  /** Fallback meta description for pages that do not pass one (every page should). */
  description: "A new app, not yet written.",
  lang: "en",
  /** Text direction. "rtl" for Arabic, Hebrew, Persian, Urdu: the prerender and the app both set it on <html>. */
  dir: "ltr" as "ltr" | "rtl",
  locale: "en_US",
  /** Public origin, no trailing slash. Set VITE_APP_URL at publish; empty means canonical/og:url are omitted. */
  url: (import.meta.env.VITE_APP_URL ?? "").replace(/\/+$/, ""),
  /** Path to a 1200x630 image in public/assets used for og:image, for example "/assets/og.png". */
  ogImage: undefined as string | undefined,
  /** For twitter:site, for example "@brand". */
  twitterHandle: undefined as string | undefined,
  nav: [] as NavItem[],
  footerNav: [] as NavItem[],
};
