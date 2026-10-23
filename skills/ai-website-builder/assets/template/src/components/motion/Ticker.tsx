import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { durationMs, prefersReducedMotion } from "./useInView";

export interface TickerProps extends Omit<ComponentProps<"ul">, "children"> {
  /** Short, true facts (opening hours, the price, the next date). Every item is real content; none is decoration. */
  items: ReactNode[];
  /** Milliseconds each item stays (default 4000). */
  interval?: number;
}

/**
 * Recipe `ticker`: the marquee-free alternative. A marquee scrolls forever and cannot be read; this shows ONE fact at a time and
 * cross-fades to the next, in place, with no horizontal movement (so right-to-left needs no special care) and no infinite CSS loop.
 *  - server render, no JavaScript and prefers-reduced-motion: ALL items are shown as an ordinary wrapped list;
 *  - after hydration the items stack in one cell and fade between each other (--duration-base, --ease-out);
 *  - it pauses while hovered or focused, and while the tab is hidden.
 * Keep items short and about the same length: the stacked cell is as tall as the tallest one.
 */
export function Ticker({ items, interval = 4000, className, ...props }: TickerProps) {
  const [active, setActive] = useState<number | null>(null);
  const paused = useRef(false);
  const count = items.length;

  useEffect(() => {
    if (count < 2 || prefersReducedMotion()) return;
    setActive(0);
    const gap = Math.max(interval, durationMs("slow", 500) * 4);
    const id = window.setInterval(() => {
      if (paused.current || document.hidden) return;
      setActive((i) => ((i ?? 0) + 1) % count);
    }, gap);
    return () => window.clearInterval(id);
  }, [count, interval]);

  return (
    <ul
      data-ticker={active === null ? "static" : "active"}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
      className={cn("m-0 list-none p-0", className)}
      {...props}
    >
      {items.map((item, i) => (
        <li key={i} data-active={active === i ? "" : undefined}>
          {item}
        </li>
      ))}
    </ul>
  );
}
