import { useEffect, useRef, useState, type ReactNode } from "react";
import { withBase } from "@/lib/base";
import { Img } from "../core/Img";
import { gate } from "./gate";
import { readMediaPolicy, wantsSmallVariant } from "./policy";
import { Runway, useRunway, type RunwayProps } from "./Runway";
import type { FramesEntry } from "./types";
import type { FramesEngine } from "./engines/frames";

export interface ScrubFramesProps extends Omit<RunwayProps, "id" | "label" | "scene" | "media" | "settled" | "children">, Omit<FramesEntry, "kind"> {
  /** Spread from the entry (`{...immersive["film"]}`); accepted so the spread type-checks. */
  kind?: "frames";
  /** What the region is, for screen readers. Default: the poster's alt text. */
  label?: string;
  /** What the preloader calls these frames (default "frames"). */
  loadingLabel?: string;
  /** Wait for every frame (`all`) or only the key frames (default): key frames are enough to scrub from. */
  gate?: "keyframes" | "all";
  fit?: "cover" | "contain";
  /** The poster is the first-screen image: eager, high priority (default true). Set false when the film is below the first screen. */
  priority?: boolean;
  /** Give up on the frames after this many ms and keep the poster (default 20000). */
  loadTimeout?: number;
  children?: ReactNode;
}

/**
 * Recipe `scrub-frames`: a frame sequence drawn on a canvas as the page scrolls through a pinned runway. Text beats (`<Beat>`) go inside.
 *
 * The poster is the first screen in the markup (server render, no JavaScript, reduced motion, Save-Data, a slow connection all keep it).
 * After hydration, for a visitor who gets motion media, the frame engine (a separate chunk, not in the page's first bundle) loads the
 * key frames first, then the rest, and the canvas replaces the poster. Phones and low-memory devices get the smaller `mobile` set.
 */
export function ScrubFrames({ id, alt, poster, desktop, mobile, label, loadingLabel, gate: gateMode, fit, priority, loadTimeout, kind: _kind, fps: _fps, children, ...runway }: ScrubFramesProps) {
  return (
    <Runway id={id} label={label ?? alt} scene="frames" media={<FramesStage id={id} alt={alt} poster={poster} desktop={desktop} mobile={mobile} loadingLabel={loadingLabel ?? "frames"} gateMode={gateMode ?? "keyframes"} fit={fit ?? "cover"} priority={priority ?? true} loadTimeout={loadTimeout ?? 20_000} />} {...runway}>
      {children}
    </Runway>
  );
}

interface StageProps {
  id: string;
  alt: string;
  poster: FramesEntry["poster"];
  desktop: FramesEntry["desktop"];
  mobile: FramesEntry["mobile"];
  loadingLabel: string;
  gateMode: "keyframes" | "all";
  fit: "cover" | "contain";
  priority: boolean;
  loadTimeout: number;
}

function FramesStage({ id, alt, poster, desktop, mobile, loadingLabel, gateMode, fit, priority, loadTimeout }: StageProps) {
  const { live, store, settle } = useRunway();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!live || !canvas) return;
    const set = mobile && wantsSmallVariant(readMediaPolicy()) ? mobile : desktop;
    gate.register(id, loadingLabel, set.count);
    let engine: FramesEngine | undefined;
    let ready = false;
    let cancelled = false;
    const finish = (state: "live" | "timeout" | "error"): void => {
      clearTimeout(timer);
      gate.done(id);
      settle(state);
    };
    const timer = setTimeout(() => {
      if (ready || cancelled) return;
      engine?.destroy();
      engine = undefined;
      finish("timeout");
    }, loadTimeout);
    const offStore = store.subscribe((p, immediate) => engine?.setProgress(p, immediate));
    const root = canvas.closest("[data-runway]");
    const io = root && typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((e) => engine?.setVisible(e.some((x) => x.isIntersecting)), { rootMargin: "20% 0px" }) : null;
    if (root) io?.observe(root);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => engine?.resize());
    ro?.observe(canvas);
    import("./engines/frames")
      .then(({ startFrames }) => {
        if (cancelled) return;
        engine = startFrames({
          canvas,
          set,
          url: withBase,
          gate: gateMode,
          fit,
          onProgress: (loaded, total) => gate.update(id, { loaded, total, detail: `${loaded} of ${total} frames` }),
          onReady: () => {
            ready = true;
            setShown(true);
            engine?.setProgress(store.get(), true);
            finish("live");
          },
          onError: () => {
            engine?.destroy();
            engine = undefined;
            ready = true;
            finish("error");
          },
        });
      })
      .catch(() => finish("error"));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      engine?.destroy();
      offStore();
      io?.disconnect();
      ro?.disconnect();
      gate.remove(id);
    };
    // the sets come from the manifest and do not change while mounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, id]);

  return (
    <>
      <Img {...poster} alt={alt} sizes="100vw" priority={priority} className="ik-fill" />
      <canvas ref={canvasRef} aria-hidden="true" className="ik-canvas" data-shown={shown ? "true" : "false"} width={desktop.width} height={desktop.height} />
    </>
  );
}
