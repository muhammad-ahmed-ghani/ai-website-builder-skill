import type { ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Heading } from "@/components/core/Heading";
import { Link } from "@/components/core/Link";
import { Button, buttonVariants } from "@/components/ui/button";
import { roleAllows, safeNextPath, useAuth, type Role } from "@/lib/app";
import { cn } from "@/lib/utils";

export interface AuthGateProps {
  /** Name of the screen, for the loading state and its heading ("Team chat"). */
  title: string;
  /** Login and sign-up screens: render in every state, and send an already signed-in visitor to `homeTo` (or to `?next=`). */
  guest?: boolean;
  /** Needed role. "admin" for admin screens; "member" (or nothing) lets any signed-in account in. */
  role?: Role;
  /** Where a signed-in visitor goes from a guest screen, and where "Back" goes from the denied screen (default "/"). */
  homeTo?: string;
  /** The sign-in screen (default "/login"). */
  loginTo?: string;
  /** Replaces the default "access denied" screen. It then owns the page's <main>. */
  denied?: ReactNode;
  children: ReactNode;
}

/**
 * The guard of an app route. Everything about the visitor is decided in the browser, so the server render and the first client render
 * always show the same thing:
 * - member and admin screens render a quiet loading placeholder (with the route's one sr-only h1) until the session is known, then the
 *   children, the sign-in redirect (`?next=` remembers the screen) or the denied screen;
 * - guest screens (login, sign-up) render their children in EVERY state, so the prerendered HTML already holds the demo credentials.
 * It renders the page's <main id="main"> itself for the loading, guest and denied states; AppShell owns it otherwise.
 * Put the page's <Seo> next to the gate, not inside it: the prerender only sees what renders on the server.
 */
export function AuthGate({ title, guest = false, role, homeTo = "/", loginTo = "/login", denied, children }: AuthGateProps) {
  const { status, user } = useAuth();
  const { pathname, search } = useLocation();

  if (guest) {
    if (status === "signed-in") {
      const next = safeNextPath(new URLSearchParams(search).get("next"));
      return <Navigate to={next && next.split(/[?#]/)[0] !== pathname ? next : homeTo} replace />;
    }
    return (
      <main id="main" tabIndex={-1} data-auth-guest className="focus:outline-none">
        {children}
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main id="main" data-auth-boot role="status" className="grid min-h-dvh place-items-center px-4 text-center">
        <h1 className="sr-only">{title}</h1>
        <p className="text-sm text-muted">{`Loading ${title}`}</p>
      </main>
    );
  }

  if (status === "signed-out" || !user) {
    const here = `${pathname}${search}`;
    const next = here === homeTo || here === "/" ? "" : `?next=${encodeURIComponent(here)}`;
    return <Navigate to={`${loginTo}${next}`} replace />;
  }

  if (role && !roleAllows(user, role)) return <>{denied ?? <AccessDenied homeTo={homeTo} loginTo={loginTo} role={role} />}</>;
  return <>{children}</>;
}

export interface AccessDeniedProps {
  homeTo?: string;
  loginTo?: string;
  /** The role the screen needs, for the explanation. */
  role?: Role;
  className?: string;
}

/** Signed in, but not allowed here. Says who is signed in, what the screen is for, and gives two ways out. Renders its own <main> and h1. */
export function AccessDenied({ homeTo = "/", loginTo = "/login", role = "admin", className }: AccessDeniedProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <main id="main" tabIndex={-1} data-access-denied className={cn("grid min-h-dvh place-items-center px-4 py-10 focus:outline-none", className)}>
      <div className="w-full max-w-md">
        <Heading level={1} size="2xl">
          You do not have access to this screen
        </Heading>
        <p className="mt-3 text-base text-muted">
          {`This screen is for ${role === "admin" ? "admins" : "signed-in members"}.${user ? ` You are signed in as ${user.name} (${user.role}).` : ""}`}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to={homeTo} className={buttonVariants({ variant: "default" })}>
            Back to the app
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              signOut();
              void navigate(loginTo, { replace: true });
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </main>
  );
}
