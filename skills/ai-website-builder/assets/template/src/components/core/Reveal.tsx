import { useEffect, useRef, type ComponentProps, type ElementType } from "react";
import { cn } from "@/lib/utils";

export interface RevealProps extends ComponentProps<"div"> {
  as?: ElementType;
  /** Extra delay in milliseconds, for staggering siblings. */
  delay?: number;
  /** `rise` (default): fades in while rising a little. `fade`: opacity only. `clip`: unmasks from the top edge, for headlines. */
  variant?: "rise" | "fade" | "clip";
}

/**
 * Fade-and-rise when scrolled into view. Safe by construction:
 *  - the server and the first client render are identical and fully visible (nothing is hidden by default)
 *  - after hydration, only elements that start BELOW the fold are hidden, then revealed by IntersectionObserver
 *  - never hidden under prefers-reduced-motion, without IntersectionObserver, or if JavaScript fails
 * The visuals live in index.css ([data-reveal]) and use the motion tokens.
 */
export function Reveal({ as: Tag = "div", delay = 0, variant = "rise", className, style, ...props }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen (or above it): leave as is

    el.dataset.revealState = "hidden";
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          el.dataset.revealState = "shown";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      delete el.dataset.revealState;
    };
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      {...(variant !== "rise" ? { "data-reveal-variant": variant } : {})}
      className={cn(className)}
      style={delay ? { transitionDelay: `${delay}ms`, ...style } : style}
      {...props}
    />
  );
}
