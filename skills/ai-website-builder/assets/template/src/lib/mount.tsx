import { StrictMode } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "../App";
import { foldIndexFileUrl, getRouterBasename } from "./base";

/**
 * Attach the app to #root. Built pages ship real HTML there (scripts/prerender.ts), so attach to it with
 * hydrateRoot instead of replacing it; in dev there is none, so render from scratch.
 * The tree must produce the same markup as src/entry-server.tsx (same <App />, router swapped for StaticRouter).
 */
export function mount(container: HTMLElement): Root {
  foldIndexFileUrl(); // ".../about/index.html" (a static host's only URL for the page) -> ".../about", before the router reads it
  const tree = (
    <StrictMode>
      <BrowserRouter basename={getRouterBasename()}>
        <App />
      </BrowserRouter>
    </StrictMode>
  );

  if (container.firstElementChild) {
    return hydrateRoot(container, tree, {
      onRecoverableError(error, info) {
        console.error("[hydration] recoverable error, markup differs from the prerendered HTML:", error, info.componentStack);
      },
    });
  }
  const root = createRoot(container);
  root.render(tree);
  return root;
}
