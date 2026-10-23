/**
 * The scrubbed-video engine (loaded on demand by ScrubVideo).
 *
 * A muted video whose `currentTime` follows a progress value. Scrubbing needs the whole file in memory, so the file is fetched in full
 * with byte progress (a host without range support, as the reels of this kind usually sit on, then costs nothing), turned into an
 * object URL and handed to the <video>. The file is assumed to be encoded with a keyframe on every frame, so a seek is cheap. A
 * requestAnimationFrame loop eases the video toward the target time and stops when it arrives; it pauses off screen.
 */

export interface VideoEngineOptions {
  video: HTMLVideoElement;
  /** Public URL of the file, already with the app's base path. */
  src: string;
  /** Size from the manifest, used for progress when the server sends no Content-Length. */
  bytes: number;
  onProgress(loaded: number, total: number): void;
  onReady(): void;
  onError(reason: string): void;
}

export interface VideoEngine {
  setProgress(p: number, immediate: boolean): void;
  setVisible(visible: boolean): void;
  destroy(): void;
}

const EASE = 0.2;
/** Smaller than one frame at 30 fps: not worth a seek. */
const MIN_STEP_S = 1 / 60;

export function startScrubVideo(o: VideoEngineOptions): VideoEngine {
  const { video } = o;
  const ctl = new AbortController();
  let objectUrl: string | null = null;
  let destroyed = false;
  let ready = false;
  let visible = true;
  let target = 0;
  let shown = 0;
  let raf = 0;

  const duration = (): number => (Number.isFinite(video.duration) ? video.duration : 0);
  const seekTo = (p: number): void => {
    const d = duration();
    if (!d) return;
    const t = Math.min(d - 0.001, Math.max(0, p * d));
    if (Math.abs(video.currentTime - t) >= MIN_STEP_S) video.currentTime = t;
  };

  const tick = (): void => {
    raf = 0;
    if (destroyed || !ready || !visible) return;
    const d = target - shown;
    shown = Math.abs(d) < 0.0004 ? target : shown + d * EASE;
    // One seek at a time: queueing seeks on a video that is still seeking only delays the picture it will end on.
    if (!video.seeking) seekTo(shown);
    if (shown !== target || video.seeking) raf = requestAnimationFrame(tick);
  };
  const kick = (): void => {
    if (!raf && visible && ready) raf = requestAnimationFrame(tick);
  };

  const fail = (reason: string): void => {
    if (!destroyed) o.onError(reason);
  };

  const attach = (url: string): void => {
    video.muted = true;
    video.preload = "auto";
    video.src = url;
    const onMeta = (): void => {
      if (destroyed) return;
      ready = true;
      seekTo(shown);
      o.onReady();
      kick();
    };
    video.addEventListener("loadeddata", onMeta, { once: true });
    video.addEventListener("error", () => fail("the video could not be decoded"), { once: true });
    video.load();
  };

  void (async () => {
    try {
      const res = await fetch(o.src, { signal: ctl.signal });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const total = Number(res.headers.get("content-length")) || o.bytes || 0;
      const reader = res.body.getReader();
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value as Uint8Array<ArrayBuffer>);
        got += value.byteLength;
        o.onProgress(Math.min(got, total || got), total || got);
      }
      if (destroyed) return;
      objectUrl = URL.createObjectURL(new Blob(chunks, { type: res.headers.get("content-type") || "video/mp4" }));
      o.onProgress(got, got);
      attach(objectUrl);
    } catch (e) {
      if (destroyed || ctl.signal.aborted) return;
      // The fetch route failed (cross-origin without CORS, say): let the browser load the file itself.
      try {
        attach(o.src);
      } catch {
        fail(`the video did not load (${(e as Error).message})`);
      }
    }
  })();

  video.addEventListener("seeked", kick);

  return {
    setProgress(p, immediate) {
      target = Math.min(1, Math.max(0, p));
      if (immediate) {
        shown = target;
        if (ready) seekTo(shown);
        return;
      }
      kick();
    },
    setVisible(v) {
      visible = v;
      if (v) kick();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    destroy() {
      destroyed = true;
      ctl.abort();
      if (raf) cancelAnimationFrame(raf);
      video.removeEventListener("seeked", kick);
      video.removeAttribute("src");
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
  };
}
