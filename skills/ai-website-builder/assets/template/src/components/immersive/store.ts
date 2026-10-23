/**
 * Progress of one runway, 0..1. Scroll writes it (rAF-coalesced by the Runway); `seek` writes it too and holds it for a moment so the
 * scroll events a seek itself causes do not undo it. Subscribers (beats, the frame engine, the video engine) are plain callbacks: a
 * change never re-renders React, it only moves DOM attributes, a canvas or a video.
 */
export type ProgressListener = (progress: number, immediate: boolean) => void;

export interface ProgressStore {
  get(): number;
  /** A reading from the scroll position. Ignored while a recent seek is held. */
  scroll(p: number): void;
  /** A jump from `window.__scenes.seek`: applied at once (engines draw without easing). */
  seek(p: number): void;
  subscribe(fn: ProgressListener): () => void;
}

const HOLD_MS = 300;
/** 0..1; NaN and -0 become 0. */
export const clamp01 = (n: number): number => (!(n > 0) ? 0 : n > 1 ? 1 : n);

export function createProgressStore(now: () => number = () => (typeof performance === "undefined" ? Date.now() : performance.now())): ProgressStore {
  let value = 0;
  let heldAt = -Infinity;
  const subs = new Set<ProgressListener>();
  const push = (p: number, immediate: boolean): void => {
    value = clamp01(p);
    for (const fn of [...subs]) fn(value, immediate);
  };
  return {
    get: () => value,
    scroll(p) {
      if (now() - heldAt < HOLD_MS) return;
      if (Math.abs(clamp01(p) - value) < 1e-5) return;
      push(p, false);
    },
    seek(p) {
      heldAt = now();
      push(p, true);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => void subs.delete(fn);
    },
  };
}

/** Progress of a runway from its box: 0 when its top meets the top of the screen, 1 when its bottom meets the bottom. */
export function runwayProgress(rectTop: number, rectHeight: number, viewportHeight: number): number {
  const span = rectHeight - viewportHeight;
  return span > 0 ? clamp01(-rectTop / span) : 0;
}

/** Scroll position (document y) at which a runway shows progress p. */
export function scrollTopFor(p: number, runwayTopOnPage: number, runwayHeight: number, viewportHeight: number): number {
  return Math.round(runwayTopOnPage + clamp01(p) * Math.max(0, runwayHeight - viewportHeight));
}
