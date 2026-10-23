/**
 * Shapes shared by the immersive kit and by the platform's `immersive_make` tool, which writes them into
 * `public/assets/immersive/<id>/manifest.json` (the record of truth, read by lint and by the platform's `immersive` gate) and mirrors the
 * ones a page needs into `src/lib/immersive.ts` (so `<ScrubFrames {...immersive["film"]} />` renders its poster on the server with no fetch).
 * Type-only: importing this file adds nothing to a bundle.
 */

/** What the capture contract calls a scene: scrub = a scrubbed video, frames = a canvas sequence, video = a loop, shader = a WebGL canvas. */
export type SceneKind = "scrub" | "frames" | "video" | "shader" | "none";

/** The motion recipe ids of the kit. They are `data-signature` values; src/components/motion/recipes.ts lists them with the six motion recipes. */
export type ImmersiveRecipe = "scrub-film" | "scrub-frames" | "pinned-chapters" | "shader-hero" | "cutout-depth" | "mascot" | "loop-hero";

/** A picture file the optimiser wrote: the same shape as an entry of `assets` (src/lib/assets.ts), so it can be spread into `<Img>`. */
export interface ImmersivePoster {
  src: string;
  width: number;
  height: number;
  sources?: { type: string; srcSet: string }[];
  blur?: string;
}

/** One numbered image sequence: `${dir}/${prefix}${n padded to pad digits}.${ext}` for n = start .. start + count - 1. */
export interface FrameSet {
  /** Public directory, for example "/assets/immersive/film/desktop". */
  dir: string;
  prefix: string;
  pad: number;
  ext: "webp" | "avif";
  count: number;
  /** Number of the first file (default 1). */
  start?: number;
  width: number;
  height: number;
  /** Sum of the file sizes, for the preloader and the gate. */
  bytes: number;
}

export interface FramesEntry {
  kind: "frames";
  id: string;
  alt: string;
  poster: ImmersivePoster;
  desktop: FrameSet;
  /** A smaller set for phones, low-memory devices and small screens. */
  mobile?: FrameSet;
  fps?: number;
}

export interface ScrubVideoEntry {
  kind: "scrub-video";
  id: string;
  alt: string;
  poster: ImmersivePoster;
  /** Public URL of the keyframe-dense MP4 (every frame is a keyframe, so seeking is cheap). */
  src: string;
  /** A smaller encode for phones. */
  mobileSrc?: string;
  width: number;
  height: number;
  duration: number;
  bytes: number;
  mobileBytes?: number;
}

export interface LoopVideoEntry {
  kind: "loop-video";
  id: string;
  alt: string;
  poster: ImmersivePoster;
  sources: { src: string; type: string }[];
  width: number;
  height: number;
  duration: number;
  bytes: number;
  /** The clip was made to play forward then backward, so a plain loop has no jump. */
  boomerang?: boolean;
}

export interface CutOutEntry {
  kind: "cutout";
  id: string;
  alt: string;
  /** Transparent webp or avif, with the usual responsive sources. */
  image: ImmersivePoster;
}

export interface MascotEntry {
  kind: "mascot";
  id: string;
  alt: string;
  /** The inline-able vector file. */
  svg: string;
  /** The still pose: shown on the server, with no JavaScript, under reduced motion and until the vector is ready. */
  pose: ImmersivePoster;
  /** Which element ids carry which behaviour: { blink: ["eye-l", "eye-r"], bob: ["body"] }. */
  parts: Partial<Record<MascotBehaviour, string[]>>;
}

export type MascotBehaviour = "blink" | "bob" | "wave" | "sway" | "wag" | "breathe";

export type ImmersiveEntry = FramesEntry | ScrubVideoEntry | LoopVideoEntry | CutOutEntry | MascotEntry;
export type ImmersiveEntries = Record<string, ImmersiveEntry>;

/** The scene record of `window.__scenes.scenes`: live, so reading `progress` again gives the current value. */
export interface SceneInfo {
  id: string;
  kind: SceneKind;
  progress: number;
  ready: boolean;
  /** "loading" | "live" | "static" | "timeout" | "error". */
  state: string;
}

/** `window.__scenes`: the capture contract (see AGENTS.md section 13). */
export interface SceneApi {
  readonly scenes: SceneInfo[];
  /** True when every preloader is done and every scene has settled (live, or fallen back to its poster). */
  readonly ready: boolean;
  /** Progress, 0..1, of the scene that is on screen (else the first one). */
  progress(): number;
  /** Jump every scrub scene to progress p. Returns a promise that resolves once the new picture is drawn. */
  seek(p: number): Promise<void>;
}

declare global {
  interface Window {
    __scenes?: SceneApi;
  }
}
