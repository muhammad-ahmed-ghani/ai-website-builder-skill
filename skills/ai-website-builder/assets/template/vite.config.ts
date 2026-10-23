import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * `vite preview` answers /subscribe (no trailing slash) with the HOME page's prerendered markup, because its single-page fallback does not look for
 * dist/subscribe/index.html. The browser then hydrates the home markup against the /subscribe route and React reports error #418 on every page but the
 * first: a false failure that every check and every repair round chases. A route that has its own prerendered page is sent to its directory
 * (/subscribe -> /subscribe/), exactly what a static host does.
 */
function prerenderedRoutes(): Plugin {
  return {
    name: "prerendered-routes",
    configurePreviewServer(server) {
      const outDir = path.resolve(server.config.root, server.config.build.outDir);
      const base = server.config.base.endsWith("/") ? server.config.base : `${server.config.base}/`;
      server.middlewares.use((req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        const raw = req.url ?? "/";
        const q = raw.indexOf("?");
        const pathname = q === -1 ? raw : raw.slice(0, q);
        const search = q === -1 ? "" : raw.slice(q);
        if (pathname.endsWith("/") || path.extname(pathname) !== "" || !pathname.startsWith(base) && `${pathname}/` !== base) return next();
        const rel = pathname.slice(base.length).replace(/^\/+/, "");
        if (!rel || rel.includes("..") || !existsSync(path.join(outDir, rel, "index.html"))) return next();
        res.statusCode = 301;
        res.setHeader("location", `${pathname}/${search}`);
        res.end();
      });
    },
  };
}

/**
 * Platform-owned build config. Keep it boring.
 *
 * Preview contract (the dev server runs in a sandbox behind a reverse proxy and is shown in an iframe):
 *  - listens on all interfaces, PORT from the environment, falls forward when the port is busy
 *  - accepts any Host header (the proxy hostnames are capability URLs we cannot list here)
 *  - CORS open, and NO X-Frame-Options / frame-ancestors header is ever set here (the gateway sets framing policy)
 *  - HMR websocket is left on auto-detect: the client connects back to the origin of the page, which is
 *    right whenever the proxy forwards websocket upgrades on the same host. Only when the proxy terminates
 *    TLS on another port than the page URL suggests, set VITE_HMR_CLIENT_PORT (for example 443).
 *    Vite 8.3 moved these knobs from `server.hmr` to `server.ws`, so the override is wired there.
 *
 * Build contract:
 *  - base defaults to "/" (apps are served from a hostname root); VITE_BASE overrides it ("/sub/" or "./")
 *  - the prerender step (scripts/prerender.ts) reads the same base
 *  - publishing (packages/publish) serves each version from an absolute sub-path and builds with VITE_BASE=/<prefix>/apps/<project>/<version>/
 *    plus VITE_APP_URL=<origin>. Use an absolute base for any sub-path host: "./" keeps script and style URLs working, but the router
 *    basename and <Img>/withBase() need the real path, so a relative base breaks client routing and public images there.
 */
export default defineConfig(({ isSsrBuild }) => {
  const port = Number(process.env.PORT) || 5173;
  const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT) || undefined;
  const base = process.env.VITE_BASE || "/";

  return {
    base,
    plugins: [react(), tailwindcss(), prerenderedRoutes()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      host: true,
      port,
      strictPort: false,
      allowedHosts: true,
      cors: true,
      ...(hmrClientPort ? { ws: { clientPort: hmrClientPort } } : {}),
      warmup: {
        clientFiles: ["./src/main.tsx", "./src/App.tsx", "./src/routes.tsx"],
      },
    },
    preview: {
      host: true,
      port,
      strictPort: false,
      allowedHosts: true,
      cors: true,
    },
    build: {
      target: "es2022",
      cssTarget: "es2022",
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rolldownOptions: {
        output: isSsrBuild
          ? { entryFileNames: "entry-server.js" }
          : {
              // A few long-lived vendor chunks so a content edit does not invalidate the framework in the browser cache.
              codeSplitting: {
                groups: [
                  { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
                  { name: "router", test: /node_modules[\\/](react-router|cookie|set-cookie-parser)[\\/]/, priority: 20 },
                  { name: "icons", test: /node_modules[\\/]lucide-react[\\/]/, priority: 15 },
                  { name: "radix", test: /node_modules[\\/](radix-ui|@radix-ui|aria-hidden|react-remove-scroll[^\\/]*|react-style-singleton|use-callback-ref|use-sidecar|get-nonce|tslib)[\\/]/, priority: 10 },
                ],
              },
            },
      },
    },
  };
});
