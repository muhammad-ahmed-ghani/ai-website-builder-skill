import type { ComponentType } from "react";
import type { Chrome } from "@/components/app/AppFrame";
import { Home } from "@/pages/Home";

export type { Chrome };

/**
 * The route table. One entry per page: it drives the router, the prerender step (one HTML file per route)
 * and sitemap.xml. NotFound is handled separately (App.tsx) and becomes dist/404.html.
 *
 * To add a page: create src/pages/<Name>.tsx (one <Seo>, one level-1 Heading), import it here, add a line.
 */
export interface AppRoute {
  /** URL path, "/" or "/about". Parameterised paths ("/blog/:slug") must list their concrete URLs in `paths`. */
  path: string;
  Component: ComponentType;
  /** Concrete URLs to prerender for a parameterised path, for example ["/blog/hello", "/blog/second-post"]. */
  paths?: string[];
  /** false = client-rendered only (app-like screens). Default true. */
  prerender?: boolean;
  /**
   * What surrounds the page. "pages" = the app header (NavBar), footer and one <main>. "app" = no app chrome: the page renders an
   * AppShell, which owns <main>. "bare" = no app chrome either: the page or its AuthGate owns <main> (login, onboarding).
   * Default: "app" when app.config.ts says `kind: "app"`, otherwise "pages". See AGENTS.md section 14.
   */
  chrome?: Chrome;
}

export const routes: AppRoute[] = [{ path: "/", Component: Home }];
