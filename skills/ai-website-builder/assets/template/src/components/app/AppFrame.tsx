import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

/** What surrounds a page: "pages" = app header, footer and one <main>; "app" = nothing (the page's AppShell owns <main>); "bare" = nothing (the page or its AuthGate owns <main>). */
export type Chrome = "pages" | "app" | "bare";

/**
 * What wraps an app route (chrome "app" or "bare"): the global providers only. No skip link, no app header or footer and no <main>:
 * the page's AppShell or AuthGate renders the one <main id="main">. App.tsx picks it for routes that are not chrome "pages".
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      {children}
      <Toaster />
    </TooltipProvider>
  );
}
