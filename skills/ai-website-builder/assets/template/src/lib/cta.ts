/**
 * Where a call to action goes. Pure (no React), so it is tested on its own.
 *
 * The client's link when they gave one, else a `mailto:` with a prefilled subject, else a `tel:` link, else nothing. "Nothing" never
 * becomes a dead button: <Cta> then renders a visible <Draft> that asks the owner for a destination.
 */

export interface CtaFallback {
  /** The client's email, exactly as they gave it. */
  email?: string;
  /** The client's phone number, exactly as they gave it. */
  phone?: string;
  /** Prefilled subject for the email ("Booking enquiry"). */
  subject?: string;
}

/** The destination a call to action goes to: the client's link, else a mailto with a prefilled subject, else a tel link, else nothing. */
export function ctaDestination(href: string | undefined, fallback: CtaFallback | undefined, text: string): string | null {
  const h = (href ?? "").trim();
  if (h && h !== "#" && !/^javascript:/i.test(h)) return h;
  const email = fallback?.email?.trim();
  if (email) return `mailto:${email}?subject=${encodeURIComponent(fallback?.subject?.trim() || text || "Enquiry")}`;
  const phone = fallback?.phone?.replace(/[^\d+]/g, "");
  if (phone) return `tel:${phone}`;
  return null;
}

