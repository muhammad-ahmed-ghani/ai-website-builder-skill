import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { durationMs } from "../motion/useInView";
import { gate, useGate } from "./gate";
import { allowsMotionMedia, readMediaPolicy } from "./policy";
import "./immersive.css";

export interface PreloaderProps extends Omit<ComponentProps<"div">, "children"> {
  /** What is loading, in plain words: "the reel", "the film", "the frames". Never a bare spinner. */
  label: string;
  /** Release after this many milliseconds whatever the media is doing (default 12000). The scenes carry on loading behind it. */
  timeout?: number;
  /** Show a Skip button (default true). Keyboard users can always lift the curtain. */
  skippable?: boolean;
}

/**
 * The loading curtain for heavy media: a progress line, a percentage and the name of what is loading, over the page until every scene
 * on it reports ready (or the timeout, or Skip). It is for a first meaningful frame that needs more than about 1.5 seconds.
 *
 * Safe by construction:
 *  - the curtain never hides content from crawlers or readers: the page is fully in the document under it, it is not aria-hidden, and
 *    nothing is inert;
 *  - it is in the server markup (data-preloader="loading") so there is no flash, and it removes itself with CSS after a fail-safe
 *    delay if JavaScript never runs, at once without JavaScript (<noscript>), and under reduced motion;
 *  - it releases at once for visitors who get no motion media (reduced motion, Save-Data, a slow connection).
 * Capture contract: data-preloader is "loading", then "done", then the element is removed; data-progress is 0..1.
 */
export function Preloader({ label, timeout = 12_000, skippable = true, className, ...props }: PreloaderProps) {
  const snap = useGate();
  const [phase, setPhase] = useState<"loading" | "done" | "gone">("loading");
  const [base] = useState(() => gate.registeredCount());
  const finish = useCallback(() => setPhase((p) => (p === "loading" ? "done" : p)), []);

  useEffect(() => {
    if (!allowsMotionMedia(readMediaPolicy())) {
      finish(); // nothing heavy will load for this visitor
      return;
    }
    document.documentElement.setAttribute("data-loading", "");
    const grace = window.setTimeout(() => {
      if (gate.registeredCount() <= base) finish(); // the page has no scene to wait for
    }, 700);
    const limit = window.setTimeout(finish, timeout);
    return () => {
      window.clearTimeout(grace);
      window.clearTimeout(limit);
      document.documentElement.removeAttribute("data-loading");
    };
  }, [timeout, finish, base]);

  useEffect(() => {
    if (snap.registered > base && snap.pending === 0) finish();
  }, [snap, base, finish]);

  useEffect(() => {
    if (phase !== "done") return;
    document.documentElement.removeAttribute("data-loading");
    const t = window.setTimeout(() => setPhase("gone"), durationMs("base", 240) + 80);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;
  const done = phase === "done";
  const shown = done ? 1 : snap.progress;
  const pct = Math.round(shown * 100);
  const name = snap.label && !done ? snap.label : label;
  return (
    <div data-preloader={done ? "done" : "loading"} data-progress={shown.toFixed(3)} className={cn("ik-preloader", className)} {...props}>
      <noscript>
        <style>{"[data-preloader]{display:none}"}</style>
      </noscript>
      <div className="ik-preloader-inner">
        <p role="status" className="ik-preloader-label font-mono text-sm uppercase tracking-wide">
          Loading {label}
        </p>
        <div role="progressbar" aria-label={`Loading ${label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="ik-preloader-line">
          <span style={{ transform: `scaleX(${shown})` }} />
        </div>
        <p className="ik-preloader-meta font-mono text-xs text-muted" aria-hidden="true">
          <span className="tabular-nums">{pct}%</span>
          {!done && snap.detail && snap.label ? <span>{`${name}: ${snap.detail}`}</span> : null}
        </p>
        {skippable ? (
          <button type="button" className="ik-preloader-skip text-sm underline underline-offset-4" onClick={finish}>
            Skip
          </button>
        ) : null}
      </div>
    </div>
  );
}
