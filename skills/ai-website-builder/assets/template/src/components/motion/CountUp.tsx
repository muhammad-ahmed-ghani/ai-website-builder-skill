import { useEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { appConfig } from "@/app.config";
import { durationMs, prefersReducedMotion, useInView } from "./useInView";

export interface CountUpProps extends Omit<ComponentProps<"span">, "children"> {
  /** The real number to land on. Only ever a figure that came from the brief: counting up to an invented statistic is still an invented statistic. */
  to: number;
  /** Start value (default 0). */
  from?: number;
  /** Fraction digits to show (default 0). */
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

const format = (n: number, decimals: number): string =>
  new Intl.NumberFormat(appConfig.lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);

/**
 * Recipe `count-up`: a figure ticks from `from` to `to` once, when it is first visible. The markup always holds the FINAL value
 * (server render, first client render, no JavaScript, reduced motion), so crawlers, readers and screenshots see the real number;
 * only after hydration does the visible digit run from the start value. Tabular numerals and a reserved width stop the neighbours
 * from jiggling. Duration is the --duration-slow token times two.
 */
export function CountUp({ to, from = 0, decimals = 0, prefix = "", suffix = "", className, ...props }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(to);
  const frame = useRef(0);

  useInView(ref, {
    immediate: true,
    onBelowFold: () => setValue(from),
    onEnter: () => {
      if (prefersReducedMotion()) return;
      const total = Math.max(300, durationMs("slow", 500) * 2);
      const started = performance.now();
      setValue(from);
      const tick = (now: number) => {
        const t = Math.min(1, (now - started) / total);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(from + (to - from) * eased);
        if (t < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
  });
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const final = `${prefix}${format(to, decimals)}${suffix}`;
  return (
    <span
      ref={ref}
      data-countup=""
      aria-label={final}
      className={cn("inline-block tabular-nums", className)}
      style={{ minInlineSize: `${final.length}ch` }}
      {...props}
    >
      <span aria-hidden="true">{`${prefix}${format(value, decimals)}${suffix}`}</span>
    </span>
  );
}
