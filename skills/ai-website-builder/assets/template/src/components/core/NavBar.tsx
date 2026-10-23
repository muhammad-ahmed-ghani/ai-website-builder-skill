import { useEffect, useState } from "react";
import { Link as RouterLink, NavLink, useLocation } from "react-router";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { appConfig, type NavItem } from "@/app.config";
import { Container } from "./Container";
import { Link } from "./Link";

/*
 * Structure only: a semantic header, a labelled nav, current-page state via aria-current (NavLink sets it),
 * and a sheet menu below md. Items come from app.config.ts. Restyle freely, but keep the semantics:
 * the brand link, <nav aria-label>, aria-current and the sheet's title/description.
 */

function isInternal(to: string) {
  return to.startsWith("/");
}

function DesktopItem({ item }: { item: NavItem }) {
  const className =
    "text-sm text-muted transition-colors duration-(--duration-fast) hover:text-fg aria-[current=page]:text-fg";
  if (!isInternal(item.to)) {
    return (
      <Link to={item.to} className={className}>
        {item.label}
      </Link>
    );
  }
  return (
    <NavLink to={item.to} end={item.to === "/"} className={className}>
      {item.label}
    </NavLink>
  );
}

export function NavBar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="border-b border-line bg-bg">
      <Container className="flex h-16 items-center justify-between gap-4">
        <RouterLink to="/" className="font-display text-lg font-semibold text-fg">
          {appConfig.name}
        </RouterLink>

        {appConfig.nav.length > 0 ? (
          <>
            <nav aria-label="Primary" className="hidden md:block">
              <ul className="flex items-center gap-6">
                {appConfig.nav.map((item) => (
                  <li key={item.to + item.label}>
                    <DesktopItem item={item} />
                  </li>
                ))}
              </ul>
            </nav>

            <div className="md:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                    <SheetDescription className="sr-only">App navigation</SheetDescription>
                  </SheetHeader>
                  <nav aria-label="Mobile">
                    <ul className="flex flex-col gap-1">
                      {appConfig.nav.map((item) => (
                        <li key={item.to + item.label}>
                          {isInternal(item.to) ? (
                            <NavLink
                              to={item.to}
                              end={item.to === "/"}
                              className="block rounded-md px-3 py-2 text-base text-muted hover:bg-surface hover:text-fg aria-[current=page]:text-fg"
                            >
                              {item.label}
                            </NavLink>
                          ) : (
                            <Link to={item.to} className="block rounded-md px-3 py-2 text-base text-muted hover:bg-surface hover:text-fg">
                              {item.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </>
        ) : null}
      </Container>
    </header>
  );
}
