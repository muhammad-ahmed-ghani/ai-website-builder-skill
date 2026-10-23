import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { withBase } from "@/lib/base";
import { cn } from "@/lib/utils";
import { Img } from "../core/Img";
import { useInViewFlag, useSceneBox } from "./scene";
import type { ImmersiveRecipe, LoopVideoEntry } from "./types";
import "./immersive.css";

export interface LoopVideoProps extends Omit<ComponentProps<"div">, "id" | "children">, Omit<LoopVideoEntry, "kind"> {
  kind?: "loop-video";
  /** The poster is the largest contentful paint of the page: eager, high priority (default true). */
  priority?: boolean;
  /** Fill the parent (a hero section sets the height) instead of keeping the video's own aspect ratio. */
  fill?: boolean;
  /** The recipe tag (`data-signature`); `false` when this loop is not the page's signature. Default `loop-hero`. */
  signature?: ImmersiveRecipe | false;
  /** Real text over the video (the h1, the call to action). Stays in the document whatever the video does. */
  children?: ReactNode;
}

/**
 * Recipe `loop-hero`: a muted, looping video behind a hero, with a poster that is in the markup from the first byte.
 *  - server render, no JavaScript, reduced motion, Save-Data and slow connections: the poster only, and the file is never requested;
 *  - after hydration the sources are attached and the video plays inline (muted, preload metadata, no sound, ever);
 *  - it pauses when it scrolls out of view or the tab is hidden, and plays again when it returns.
 * A boomerang is made when the file is made (the clip plays forward then backward), so a plain `loop` has no jump.
 */
export function LoopVideo({ id, alt, poster, sources, width, height, duration: _duration, bytes: _bytes, boomerang, kind: _kind, priority = true, fill = false, signature, className, style, children, ...props }: LoopVideoProps) {
  const { ref, live, settle } = useSceneBox<HTMLDivElement>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const inViewRef = useRef(true);
  const tag = signature === false ? undefined : (signature ?? "loop-hero");

  const start = (): void => {
    const video = videoRef.current;
    if (!video || !inViewRef.current || document.hidden) return;
    video.play().catch((e: unknown) => {
      // Autoplay refused: the poster stays. An interrupted request (the video scrolled away, the tab hid) is not a refusal.
      if ((e as { name?: string }).name === "NotAllowedError") ref.current?.setAttribute("data-state", "static");
    });
  };

  useInViewFlag(ref, live, (v) => {
    inViewRef.current = v;
    if (v) start();
    else videoRef.current?.pause();
  });

  useEffect(() => {
    const video = videoRef.current;
    const box = ref.current;
    if (!live || !video || !box) return;
    for (const s of sources) {
      const el = document.createElement("source");
      el.src = withBase(s.src);
      el.type = s.type;
      video.appendChild(el);
    }
    video.load();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled && box.getAttribute("data-ready") !== "true") settle("timeout");
    }, 8000);
    // The scene has settled once the file is known to be playable; whether it is playing right now depends on being in view.
    const onMeta = (): void => {
      clearTimeout(timer);
      settle("live");
    };
    const onPlaying = (): void => setPlaying(true);
    const onTime = (): void => {
      if (video.duration) box.setAttribute("data-progress", (video.currentTime / video.duration).toFixed(3));
    };
    const onVisibility = (): void => {
      if (document.hidden) video.pause();
      else start();
    };
    video.addEventListener("loadedmetadata", onMeta, { once: true });
    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("error", () => { clearTimeout(timer); settle("error"); }, { once: true, capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onTime);
      document.removeEventListener("visibilitychange", onVisibility);
      video.pause();
      while (video.firstChild) video.removeChild(video.firstChild);
    };
    // the sources come from the manifest and do not change while mounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  return (
    <div
      ref={ref}
      data-loop-video=""
      data-scene="video"
      data-scene-id={id}
      data-progress="0"
      data-ready="false"
      data-state="loading"
      {...(boomerang ? { "data-boomerang": "" } : {})}
      {...(tag ? { "data-signature": tag, "data-scene-signature": tag } : {})}
      className={cn("ik-loop", fill && "ik-loop-fill", className)}
      style={fill ? style : { aspectRatio: `${width} / ${height}`, ...style }}
      {...props}
    >
      <Img {...poster} alt={alt} sizes="100vw" priority={priority} className="ik-fill" />
      <video ref={videoRef} muted loop playsInline preload="metadata" tabIndex={-1} aria-hidden="true" disablePictureInPicture disableRemotePlayback className="ik-canvas" data-shown={playing ? "true" : "false"} />
      {children ? <div className="ik-overlay">{children}</div> : null}
    </div>
  );
}
