import type { FrameSet } from "../types";

/**
 * The frame-sequence engine (loaded on demand by ScrubFrames, never part of the page's first bundle).
 *
 * Loads the numbered files of one FrameSet in a progressive order (first, last, every 8th, then the rest in order), reports progress,
 * and draws the frame for a progress value onto a canvas with a cover fit, at the screen's pixel density. While a frame has not
 * arrived, the nearest one that has is drawn, so scrubbing works from the key frames on. Stops drawing when told the scene is off screen.
 */

export const KEY_STEP = 8;

/** Index of the file for frame i of a set (0-based), as a public URL (the caller applies the app's base path). */
export function frameUrl(set: Pick<FrameSet, "dir" | "prefix" | "pad" | "ext" | "start">, i: number): string {
  return `${set.dir}/${set.prefix}${String((set.start ?? 1) + i).padStart(set.pad, "0")}.${set.ext}`;
}

/** First, last, every KEY_STEP-th, then everything else in order. Each index once. */
export function loadOrder(count: number, step = KEY_STEP): { order: number[]; keyCount: number } {
  if (count <= 0) return { order: [], keyCount: 0 };
  const seen = new Set<number>();
  const order: number[] = [];
  const add = (i: number): void => {
    if (i >= 0 && i < count && !seen.has(i)) {
      seen.add(i);
      order.push(i);
    }
  };
  add(0);
  add(count - 1);
  for (let i = step; i < count; i += step) add(i);
  const keyCount = order.length;
  for (let i = 0; i < count; i++) add(i);
  return { order, keyCount };
}

/** The nearest index to `want` that is loaded, searching outward; -1 when nothing is. */
export function nearestLoaded(loaded: ArrayLike<unknown>, want: number): number {
  const n = loaded.length;
  for (let d = 0; d < n; d++) {
    if (want - d >= 0 && loaded[want - d]) return want - d;
    if (want + d < n && loaded[want + d]) return want + d;
  }
  return -1;
}

/** Source rectangle that fills (cover) or fits (contain) a destination box. */
export function fitRect(srcW: number, srcH: number, dstW: number, dstH: number, mode: "cover" | "contain"): { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number } {
  const s = mode === "cover" ? Math.max(dstW / srcW, dstH / srcH) : Math.min(dstW / srcW, dstH / srcH);
  if (mode === "cover") {
    const sw = dstW / s;
    const sh = dstH / s;
    return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh, dx: 0, dy: 0, dw: dstW, dh: dstH };
  }
  const dw = srcW * s;
  const dh = srcH * s;
  return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: (dstW - dw) / 2, dy: (dstH - dh) / 2, dw, dh };
}

export interface FramesEngineOptions {
  canvas: HTMLCanvasElement;
  set: FrameSet;
  /** Turns a public path into a URL for this app (the base path). */
  url(publicPath: string): string;
  /** Wait for all frames (`all`) or only the key frames (`keyframes`, default) before saying ready. */
  gate?: "keyframes" | "all";
  fit?: "cover" | "contain";
  /** Parallel downloads (default 6). */
  concurrency?: number;
  onProgress(loaded: number, total: number): void;
  onReady(): void;
  onError(reason: string): void;
}

export interface FramesEngine {
  /** Show the frame for progress p (0..1). `immediate` skips the easing. */
  setProgress(p: number, immediate: boolean): void;
  setVisible(visible: boolean): void;
  resize(): void;
  destroy(): void;
}

const EASE = 0.22;

export function startFrames(o: FramesEngineOptions): FramesEngine {
  const { set, canvas } = o;
  const ctx = canvas.getContext("2d", { alpha: false });
  const frames: (HTMLImageElement | undefined)[] = new Array(set.count);
  const { order, keyCount } = loadOrder(set.count);
  let destroyed = false;
  let visible = true;
  let target = 0;
  let shown = 0;
  let drawn = -1;
  let raf = 0;
  let canvasPainted = false;
  let loaded = 0;
  let settled = 0;
  let readyFired = false;
  let cssW = 0;

  const fail = (reason: string): void => {
    if (!destroyed) o.onError(reason);
  };
  if (!ctx) {
    fail("canvas 2d is not available");
    return { setProgress() {}, setVisible() {}, resize() {}, destroy() {} };
  }

  const draw = (index: number): void => {
    const at = nearestLoaded(frames, index);
    if (at < 0) return;
    const img = frames[at]!;
    const f = fitRect(img.naturalWidth || set.width, img.naturalHeight || set.height, canvas.width, canvas.height, o.fit ?? "cover");
    if (f.dx > 0 || f.dy > 0) ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, f.sx, f.sy, f.sw, f.sh, f.dx, f.dy, f.dw, f.dh);
    drawn = index;
    canvas.setAttribute("data-frame", String(index + (set.start ?? 1)));
  };

  const indexFor = (p: number): number => Math.min(set.count - 1, Math.max(0, Math.round(p * (set.count - 1))));

  const tick = (): void => {
    raf = 0;
    if (destroyed || !visible) return;
    const d = target - shown;
    if (Math.abs(d) < 0.0004) shown = target;
    else shown += d * EASE;
    const i = indexFor(shown);
    if (i !== drawn || !canvasPainted) draw(i);
    if (shown !== target) raf = requestAnimationFrame(tick);
  };

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    // Never more pixels than the source can fill: a 1280-wide frame gains nothing from a 3840-wide backing store.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(dpr, (set.width * 1.5) / rect.width);
    const w = Math.max(1, Math.round(rect.width * scale));
    const h = Math.max(1, Math.round(rect.height * scale));
    if (w === canvas.width && h === canvas.height && rect.width === cssW) return;
    cssW = rect.width;
    canvas.width = w;
    canvas.height = h;
    canvasPainted = false;
    drawn = -1;
    draw(indexFor(shown));
    canvasPainted = true;
  };

  const fireReady = (): void => {
    if (readyFired || destroyed) return;
    readyFired = true;
    resize();
    draw(indexFor(shown));
    canvasPainted = true;
    o.onReady();
  };

  const needed = (): number => (o.gate === "all" ? set.count : keyCount);
  const done = (ok: boolean, index: number): void => {
    settled++;
    if (ok) loaded++;
    else if (index === 0) return fail("the first frame did not load");
    o.onProgress(Math.min(settled, needed()), needed());
    if (settled >= needed()) fireReady();
    if (settled >= set.count && loaded < set.count * 0.5) fail("more than half of the frames did not load");
  };

  // download pool
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (!destroyed) {
      const n = cursor++;
      if (n >= order.length) return;
      const index = order[n]!;
      const img = new Image();
      img.decoding = "async";
      img.src = o.url(frameUrl(set, index));
      let ok = true;
      try {
        await img.decode();
      } catch {
        ok = false;
      }
      if (destroyed) return;
      if (ok) frames[index] = img;
      if (ok && index === indexFor(shown)) draw(index);
      done(ok, index);
    }
  };
  const pool = Math.max(1, Math.min(o.concurrency ?? 6, order.length));
  for (let i = 0; i < pool; i++) void worker();

  return {
    setProgress(p, immediate) {
      target = Math.min(1, Math.max(0, p));
      if (immediate) {
        shown = target;
        if (visible) draw(indexFor(shown));
        return;
      }
      if (visible && !raf) raf = requestAnimationFrame(tick);
    },
    setVisible(v) {
      visible = v;
      if (v && !raf) raf = requestAnimationFrame(tick);
      if (!v && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    resize,
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      for (let i = 0; i < frames.length; i++) frames[i] = undefined;
    },
  };
}
