import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface DraftProps {
  /** Unique, kebab-case: `opening-hours`, `reply-time`. The owner confirms drafts by this id. */
  id: string;
  /** What the owner must supply, in plain words: "Opening hours", "Price of a first visit". */
  label: string;
  /** A NEUTRAL placeholder ("Opening hours to be confirmed"), never a plausible invention. */
  children: ReactNode;
  /** Set by `<Cta>` for a call to action that has no destination yet: the design keeps its button (same look and size), and the marker is the asterisk and the tooltip. */
  button?: Pick<ButtonProps, "variant" | "size" | "className">;
}

const accepted = (id: string): boolean => {
  const v = (import.meta.env.VITE_ACCEPT_DRAFTS ?? "").trim();
  return v === "*" || v.split(",").some((x) => x.trim() === id);
};

/**
 * A placeholder for a fact the client never gave. Use it instead of inventing a price, hours, a reply time or a policy, and use it SPARINGLY: leaving the
 * fact out is the default, at most ONE Draft may be visible in a page's first screen, and every other missing fact belongs in a single calm
 * "details to confirm" area lower on the page.
 *
 * It is a small marker, not a box: the text stays in the design's own type and colour, with a dotted underline and a tiny asterisk, and the label is in
 * the tooltip. The platform lists every Draft for the owner (the claims panel) and refuses to publish while any remain; when the owner accepts a draft as
 * it is, the publish build renders its children as plain text with no marker.
 */
export function Draft({ id, label, children, button }: DraftProps) {
  if (accepted(id)) return <>{children}</>;
  if (button) {
    return (
      <Button asChild {...button}>
        <span data-draft={id} data-draft-label={label} title={`To confirm: ${label}`}>
          {children}
          <sup aria-hidden="true" className="text-xs font-medium">*</sup>
        </span>
      </Button>
    );
  }
  return (
    <span data-draft={id} data-draft-label={label} title={`To confirm: ${label}`} className="text-muted underline decoration-dotted decoration-muted underline-offset-4">
      {children}
      <sup aria-hidden="true" className="ms-0.5 text-xs font-medium no-underline">*</sup>
    </span>
  );
}
