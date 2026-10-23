import { useEffect, type RefObject } from "react";

/** True when the visitor asked for less motion. Read in effects only: the server and the first client render never depend on it. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A duration token in milliseconds ("fast" | "base" | "slow"), read from the compiled CSS variables so a new direction retimes every recipe. */
export function durationMs(name: "fast" | "base" | "slow", fallback: number): number {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--duration-${name}`).trim();
  const m = /^(-?[\d.]+)(ms|s)$/.exec(raw);
  if (!m) return fallback;
  return m[2] === "s" ? Number(m[1]) * 1000 : Number(m[1]);
}

export interface InViewHandlers {
  /** The element starts below the fold: hide it here (set a data attribute), it will be shown on entry. */
  onBelowFold?: (el: HTMLElement) => void;
  /** The element came into view (or was already in view, with `immediate`). Reveal it here. */
  onEnter: (el: HTMLElement) => void;
  /** Also fire `onEnter` for elements that are already on screen at mount (a count-up on the first screen should still tick). */
  immediate?: boolean;
  /** Undo anything done to the element (data attributes) on unmount. */
  onCleanup?: (el: HTMLElement) => void;
}

/**
 * The contract every motion recipe in this folder keeps ("safe by construction", the same as Reveal):
 *  - the server render and the first client render are identical and show everything: nothing is hidden by default;
 *  - only after hydration, only for elements that start BELOW the fold, are they hidden, then shown when scrolled to;
 *  - nothing runs under prefers-reduced-motion, without IntersectionObserver, or if JavaScript fails;
 *  - it only reads layout once and observes once: no scroll listeners.
 */
export function useInView(ref: RefObject<HTMLElement | null>, h: InViewHandlers): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || prefersReducedMotion()) return;
    const onScreen = el.getBoundingClientRect().top < window.innerHeight;
    if (onScreen) {
      if (h.immediate) h.onEnter(el);
      return;
    }
    h.onBelowFold?.(el);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          h.onEnter(el);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      h.onCleanup?.(el);
    };
    // handlers are created inline by the recipes and only used at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
