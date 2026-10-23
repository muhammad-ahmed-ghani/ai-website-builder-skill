import { matchPath, Route, Routes, useLocation } from "react-router";
import { AppFrame, type Chrome } from "@/components/app/AppFrame";
import { Layout } from "@/components/core";
import { NotFound } from "@/pages/NotFound";
import { routes } from "./routes";
import { appConfig } from "./app.config";

/** The chrome of the page at `pathname`: the matched route's own, else the app default ("app" for an app, "pages" otherwise). */
export function chromeFor(pathname: string): Chrome {
  const fallback: Chrome = appConfig.kind === "app" ? "app" : "pages";
  for (const route of routes) {
    if (matchPath({ path: route.path, end: true }, pathname)) return (route as { chrome?: Chrome }).chrome ?? fallback;
  }
  return fallback;
}

/** Shared by the browser entry (main.tsx) and the prerender entry (entry-server.tsx): same tree, same markup. */
export function App() {
  const chrome = chromeFor(useLocation().pathname);
  const notFound = <NotFound />;
  const tree = (
    <Routes>
      {routes.map(({ path, Component }) => (
        <Route key={path} path={path} element={<Component />} />
      ))}
      <Route
        path="*"
        element={
          chrome === "pages" ? (
            notFound
          ) : (
            <main id="main" tabIndex={-1} className="focus:outline-none">
              {notFound}
            </main>
          )
        }
      />
    </Routes>
  );
  return chrome === "pages" ? <Layout>{tree}</Layout> : <AppFrame>{tree}</AppFrame>;
}
