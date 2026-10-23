import { useEffect, useRef, useState, type ReactNode } from "react";
import { withBase } from "@/lib/base";
import { Img } from "../core/Img";
import { gate } from "./gate";
import { readMediaPolicy, wantsSmallVariant } from "./policy";
import { Runway, useRunway, type RunwayProps } from "./Runway";
import type { ScrubVideoEntry } from "./types";
import type { VideoEngine } from "./engines/video";

export interface ScrubVideoProps extends Omit<RunwayProps, "id" | "label" | "scene" | "media" | "settled" | "children">, Omit<ScrubVideoEntry, "kind"> {
  kind?: "scrub-video";
  label?: string;
  /** What the preloader calls the file (default "reel"). */
  loadingLabel?: string;
  priority?: boolean;
  /** Give up on the file after this many ms and keep the poster (default 25000). */
  loadTimeout?: number;
  children?: ReactNode;
}

/**
 * Recipe `scrub-film`: one muted video whose time follows the scroll position through a pinned runway. The file is encoded with a
 * keyframe on every frame (so seeking is cheap) and is fetched in full before the first reveal (scrubbing needs all of it); put a
 * `<Preloader label="the reel" />` on the page. Poster, no-JavaScript, reduced-motion, Save-Data and slow-connection visitors keep the
 * poster and never download the file; phones get `mobileSrc` when the entry has one.
 */
export function ScrubVideo({ id, alt, poster, src, mobileSrc, bytes, mobileBytes, label, loadingLabel, priority, loadTimeout, kind: _kind, width: _w, height: _h, duration: _d, children, ...runway }: ScrubVideoProps) {
  return (
    <Runway id={id} label={label ?? alt} scene="scrub" media={<VideoStage id={id} alt={alt} poster={poster} src={src} mobileSrc={mobileSrc} bytes={bytes} mobileBytes={mobileBytes} loadingLabel={loadingLabel ?? "reel"} priority={priority ?? true} loadTimeout={loadTimeout ?? 25_000} />} {...runway}>
      {children}
    </Runway>
  );
}

interface StageProps {
  id: string;
  alt: string;
  poster: ScrubVideoEntry["poster"];
  src: string;
  mobileSrc: string | undefined;
  bytes: number;
  mobileBytes: number | undefined;
  loadingLabel: string;
  priority: boolean;
  loadTimeout: number;
}

function VideoStage({ id, alt, poster, src, mobileSrc, bytes, mobileBytes, loadingLabel, priority, loadTimeout }: StageProps) {
  const { live, store, settle } = useRunway();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!live || !video) return;
    const small = !!mobileSrc && wantsSmallVariant(readMediaPolicy());
    const file = small ? mobileSrc! : src;
    const size = small ? (mobileBytes ?? bytes) : bytes;
    gate.register(id, loadingLabel, size);
    let engine: VideoEngine | undefined;
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
    const root = video.closest("[data-runway]");
    const io = root && typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((e) => engine?.setVisible(e.some((x) => x.isIntersecting)), { rootMargin: "20% 0px" }) : null;
    if (root) io?.observe(root);
    import("./engines/video")
      .then(({ startScrubVideo }) => {
        if (cancelled) return;
        engine = startScrubVideo({
          video,
          src: withBase(file),
          bytes: size,
          onProgress: (loaded, total) => gate.update(id, { loaded, total, detail: `${(loaded / 1e6).toFixed(1)} of ${(total / 1e6).toFixed(1)} MB` }),
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
      gate.remove(id);
    };
    // the entry does not change while mounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, id]);

  return (
    <>
      <Img {...poster} alt={alt} sizes="100vw" priority={priority} className="ik-fill" />
      <video ref={videoRef} muted playsInline preload="none" tabIndex={-1} aria-hidden="true" disablePictureInPicture disableRemotePlayback className="ik-canvas" data-shown={shown ? "true" : "false"} />
    </>
  );
}
