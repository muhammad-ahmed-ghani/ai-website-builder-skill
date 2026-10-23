import { clamp01 } from "./store";
import type { SceneApi, SceneInfo, SceneKind } from "./types";

/**
 * The capture contract: what a program (the platform's vision tool, a test, an audit) can rely on to wait for and drive a page that
 * uses the kit, without a real wheel gesture.
 *
 *   [data-scene="scrub|frames|video|shader|none"]  the stage, with data-progress (0..1), data-ready ("true" once settled) and data-state
 *   [data-preloader="loading"]                     becomes "done" when the page may be looked at, then is removed
 *   window.__scenes = { scenes, ready, progress(), seek(p) }
 *
 * Everything is read from the DOM, so `ready` is right before hydration too (the server markup says "loading" and "ready false").
 * `seek(p)` jumps every runway to p (and scrolls the first one into place) and resolves once the new picture is drawn.
 */

export interface RunwayHandle {
  id: string;
  el: HTMLElement;
  progress(): number;
  /** Jump to p. `scroll` moves the page to the matching scroll position (done for one runway only). */
  seek(p: number, o: { scroll: boolean }): Promise<void>;
}

const runways = new Map<string, RunwayHandle>();

export function registerRunway(h: RunwayHandle): () => void {
  runways.set(h.id, h);
  return () => {
    if (runways.get(h.id) === h) runways.delete(h.id);
  };
}

const KINDS: readonly string[] = ["scrub", "frames", "video", "shader", "none"];

function readScenes(): SceneInfo[] {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll<HTMLElement>("[data-scene]")).map((el, i) => {
    const kind = el.getAttribute("data-scene") ?? "none";
    const p = parseFloat(el.getAttribute("data-progress") ?? "");
    return {
      id: el.getAttribute("data-scene-id") ?? (el.id || `scene-${i + 1}`),
      kind: (KINDS.includes(kind) ? kind : "none") as SceneKind,
      progress: Number.isFinite(p) ? p : 0,
      ready: el.getAttribute("data-ready") === "true",
      state: el.getAttribute("data-state") ?? "loading",
    };
  });
}

function isReady(): boolean {
  if (typeof document === "undefined") return false;
  if (document.querySelector('[data-preloader="loading"]')) return false;
  return !document.querySelector('[data-scene][data-ready="false"]');
}

/** The runway that is on screen: the one that holds the middle of the viewport, else the nearest, else the first. */
function primaryRunway(): RunwayHandle | undefined {
  const list = [...runways.values()].filter((h) => h.el.isConnected);
  if (list.length <= 1) return list[0];
  const mid = window.innerHeight / 2;
  let best = list[0]!;
  let bestDistance = Infinity;
  for (const h of list) {
    const r = h.el.getBoundingClientRect();
    const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
    if (d < bestDistance) {
      best = h;
      bestDistance = d;
    }
  }
  return best;
}

const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));

export function installCaptureApi(): SceneApi | undefined {
  if (typeof window === "undefined") return undefined;
  if (window.__scenes) return window.__scenes;
  const api = {
    get scenes(): SceneInfo[] {
      return readScenes();
    },
    get ready(): boolean {
      return isReady();
    },
    progress(): number {
      const run = primaryRunway();
      if (run) return clamp01(run.progress());
      const first = readScenes()[0];
      return first ? clamp01(first.progress) : 0;
    },
    async seek(p: number): Promise<void> {
      const v = clamp01(Number(p));
      const lead = primaryRunway();
      await Promise.all([...runways.values()].map((h) => h.seek(v, { scroll: h === lead })));
      await nextFrame();
    },
  } satisfies SceneApi;
  Object.defineProperty(window, "__scenes", { value: api, configurable: true, writable: true });
  return api;
}

if (typeof window !== "undefined") installCaptureApi();
