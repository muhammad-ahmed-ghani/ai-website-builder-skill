import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Footer } from "./Footer";
import { NavBar } from "./NavBar";
import { ScrollManager } from "./ScrollManager";
import { SkipLink } from "./SkipLink";

/** App shell: skip link, header, one <main id="main">, footer, global providers. */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SkipLink />
      <NavBar />
      <main id="main" tabIndex={-1} className="min-h-[60dvh] focus:outline-none">
        {children}
      </main>
      <Footer />
      <Toaster />
      <ScrollManager />
    </TooltipProvider>
  );
}
