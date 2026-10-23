import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Draft } from "./Draft";
import { Link } from "./Link";
import { ctaDestination, type CtaFallback } from "@/lib/cta";

export type { CtaFallback } from "@/lib/cta";
export { ctaDestination } from "@/lib/cta";

export interface CtaProps extends Pick<ButtonProps, "variant" | "size" | "className"> {
  /** The real destination the client gave (a booking or signup link, or a page of this app). */
  href?: string | undefined;
  /** Used when there is no `href`: the client's own email, else their phone. Never invent either. */
  fallback?: CtaFallback;
  /** Open an absolute `href` in a new tab. */
  newTab?: boolean;
  /** Id for the placeholder shown when there is no destination at all. */
  draftId?: string;
  children: ReactNode;
}

/**
 * A call to action that always works. It goes to the client's link when they gave one, otherwise to their email (with a prefilled
 * subject) or their phone. When the client gave none of these it does NOT render a dead or disabled button: it renders a visible
 * <Draft> that looks like the button (a small asterisk and a tooltip mark it), so the owner is asked for the destination and publishing waits for it.
 */
export function Cta({ href, fallback, newTab = false, draftId, children, variant, size, className }: CtaProps) {
  const text = typeof children === "string" ? children : "";
  const to = ctaDestination(href, fallback, text);
  if (!to) {
    const id = draftId ?? `cta-${(text || "action").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "action"}`;
    // the button keeps its place and its look in the design; only the asterisk and the tooltip say that its destination is still to be confirmed
    return <Draft id={id} label={text ? `Where "${text}" should go (a link, an email or a phone number)` : "Where this button should go"} button={{ ...(variant ? { variant } : {}), ...(size ? { size } : {}), ...(className ? { className } : {}) }}>{children}</Draft>;
  }
  return (
    <Button asChild {...(variant ? { variant } : {})} {...(size ? { size } : {})} {...(className ? { className } : {})}>
      <Link to={to} newTab={newTab}>
        {children}
      </Link>
    </Button>
  );
}
