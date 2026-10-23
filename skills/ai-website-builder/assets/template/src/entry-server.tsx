import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { App } from "./App";
import { HeadProvider, type HeadCollector, type HeadData } from "./lib/head";
import { renderHeadTags } from "./lib/head-server";
import { getRouterBasename } from "./lib/base";
import { routes } from "./routes";
import { appConfig } from "./app.config";

/** Prerender entry. Built by `vite build --ssr` and consumed by scripts/prerender.ts; never loaded in the browser. */

export interface RenderResult {
  html: string;
  head: HeadData | null;
  headTags: string;
}

/** Render one URL (a path inside the app, for example "/about") to markup plus its head data. */
export function render(path: string): RenderResult {
  const collector: HeadCollector = { data: null };
  const basename = getRouterBasename();
  const html = renderToString(
    <StrictMode>
      <HeadProvider collector={collector}>
        <StaticRouter location={`${basename}${path}`} basename={basename}>
          <App />
        </StaticRouter>
      </HeadProvider>
    </StrictMode>,
  );
  return { html, head: collector.data, headTags: collector.data ? renderHeadTags(collector.data) : "" };
}

export { routes, appConfig };
