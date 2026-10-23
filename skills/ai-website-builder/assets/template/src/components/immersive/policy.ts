/**
 * Who gets motion media. Read in effects only: the server and the first client render never depend on it, so hydration stays clean.
 * Motion media (a film, a frame sequence, a looping video, a shader) is for a visitor who allows motion, is not saving data and has a
 * connection that can carry it. Everyone else gets the poster, which is always in the markup.
 */
export interface MediaPolicy {
  /** The visitor did not ask for reduced motion. */
  motion: boolean;
  /** Save-Data is on. */
  saveData: boolean;
  /** The browser reports a 2g or 3g connection. */
  slow: boolean;
  /** A narrow screen: phones and small tablets get the smaller variant. */
  small: boolean;
  /** 2 GB of memory or less: a long frame sequence would be decoded into too much of it. */
  lowMemory: boolean;
}

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

export function readMediaPolicy(): MediaPolicy {
  const win = typeof window === "undefined" ? undefined : window;
  const mm = (q: string): boolean => !!win && typeof win.matchMedia === "function" && win.matchMedia(q).matches;
  const nav = (typeof navigator === "undefined" ? {} : navigator) as Navigator & { connection?: NetworkInformation; deviceMemory?: number };
  const c = nav.connection;
  return {
    motion: !mm("(prefers-reduced-motion: reduce)"),
    saveData: c?.saveData === true,
    // effectiveType is the browser's own summary of measured round-trip time and throughput; the raw downlink figure is too noisy to decide on.
    slow: c?.effectiveType === "slow-2g" || c?.effectiveType === "2g" || c?.effectiveType === "3g",
    small: mm("(max-width: 767px)"),
    lowMemory: typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2,
  };
}

/** May this visitor be sent a film, a sequence, a loop or a shader at all? */
export const allowsMotionMedia = (p: MediaPolicy): boolean => p.motion && !p.saveData && !p.slow;

/** Which variant to fetch: the smaller one for small screens and low-memory devices. */
export const wantsSmallVariant = (p: MediaPolicy): boolean => p.small || p.lowMemory;
