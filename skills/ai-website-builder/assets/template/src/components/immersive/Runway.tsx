import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { registerRunway } from "./capture";
import { allowsMotionMedia, readMediaPolicy } from "./policy";
import { clamp01, createProgressStore, runwayProgress, scrollTopFor, type ProgressStore } from "./store";
import type { ImmersiveRecipe, SceneKind } from "./types";
import "./immersive.css";

/** What the components inside a runway can read and do. */
export interface RunwayContextValue {
  id: string;
  scene: SceneKind;
  store: ProgressStore;
  /** The pinned layout is on (motion allowed). Otherwise the runway is the static fallback: poster first, text in normal flow. */
  live: boolean;
  /** Called by a media component once its media is ready, or has fallen back to the poster. Sets data-ready and data-state on the stage. */
  settle(state: "live" | "static" | "timeout" | "error"): void;
  scrollToProgress(p: number): void;
}

const RunwayContext = createContext<RunwayContextValue | null>(null);

/** The runway the component sits in. Throws outside one: a beat or a chapter list has no meaning on its own. */
export function useRunway(): RunwayContextValue {
  const ctx = useContext(RunwayContext);
  if (!ctx) throw new Error("This component must be rendered inside <Runway> (or ScrubFrames, ScrubVideo).");
  return ctx;
}

/** The signature recipe a scene carries when the page does not say otherwise. */
const DEFAULT_RECIPE: Record<SceneKind, ImmersiveRecipe> = {
  scrub: "scrub-film",
  frames: "scrub-frames",
  none: "pinned-chapters",
  shader: "shader-hero",
  video: "loop-hero",
};

export const recipeFor = (scene: SceneKind): ImmersiveRecipe => DEFAULT_RECIPE[scene];

export interface RunwayProps extends Omit<ComponentProps<"section">, "id" | "children" | "aria-label"> {
  /** Names the scene for the capture contract and prefixes chapter anchors. Lower-case words and dashes. */
  id: string;
  /** What the region is, for screen readers: "How the pot is thrown". */
  label: string;
  /** Length of the scroll runway in screens. 3 to 8 reads well; the default is 5. Clamped to 2..10. */
  screens?: number;
  scene?: SceneKind;
  /** The media of the stage (poster, canvas, video). Rendered behind everything else, aria-hidden by its component. */
  media?: ReactNode;
  /** The signature recipe this element carries (`data-signature`). Default by scene; `false` when it is not the page's signature. */
  signature?: ImmersiveRecipe | false;
  /** The stage is settled with no media to wait for (a runway of text beats only). */
  settled?: boolean;
  children?: ReactNode;
}

/**
 * A tall section with a pinned stage: the page scrolls natively through `screens` viewport heights while the stage stays on screen
 * (`position: sticky`, never a scroll hijack), and everything inside reads the runway's progress (0..1): text beats appear in ranges,
 * a frame sequence or a film follows it, chapter links jump to marks.
 *
 * Safe by construction (the same contract as Reveal and the motion recipes):
 *  - the server render and the first client render are the static layout: the poster as the first screen and every beat as ordinary text
 *    below it, so crawlers, readers, no-JavaScript and reduced-motion visitors get all the content;
 *  - only after hydration, only when motion is allowed (no reduced-motion, no Save-Data, no slow connection), the pinned layout switches on;
 *  - height is reserved from the first paint (no layout shift), and nothing listens to scroll before then.
 * The stage carries data-scene, data-progress, data-ready and data-state: see capture.ts.
 */
export function Runway({ id, label, screens = 5, scene = "none", media, signature, settled, className, style, children, ...props }: RunwayProps) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const store = useMemo(() => createProgressStore(), []);
  const [live, setLive] = useState(false);
  const length = Math.min(10, Math.max(2, screens));
  const tag = signature === false ? undefined : (signature ?? recipeFor(scene));

  const settle = useCallback((state: "live" | "static" | "timeout" | "error") => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.setAttribute("data-state", state);
    stage.setAttribute("data-ready", "true");
  }, []);

  // 1. decide the layout, once, after hydration
  useEffect(() => {
    const policy = readMediaPolicy();
    const on = scene === "none" ? policy.motion : allowsMotionMedia(policy);
    setLive(on);
    if (!on) {
      rootRef.current?.setAttribute("data-runway-compact", "");
      settle("static"); // nothing will load: the poster is the scene
    } else if (scene === "none" || settled) settle("live");
  }, [scene, settled, settle]);

  // 2. progress follows the scroll position (native scroll, one passive listener, one rAF per frame)
  useEffect(() => {
    if (!live) return;
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    let raf = 0;
    const update = (): void => {
      raf = 0;
      const r = root.getBoundingClientRect();
      store.scroll(runwayProgress(r.top, r.height, window.innerHeight));
    };
    const schedule = (): void => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const off = store.subscribe((p) => stage.setAttribute("data-progress", p.toFixed(4)));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => root.setAttribute("data-in-view", String(entries.some((e) => e.isIntersecting))), { rootMargin: "25% 0px" });
    io?.observe(root);
    update();
    return () => {
      off();
      io?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [live, store]);

  const scrollToProgress = useCallback(
    (p: number) => {
      const root = rootRef.current;
      if (!root) return;
      const r = root.getBoundingClientRect();
      window.scrollTo({ top: scrollTopFor(p, r.top + window.scrollY, r.height, window.innerHeight), behavior: "smooth" });
    },
    [],
  );

  // 3. the capture contract
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return registerRunway({
      id,
      el: root,
      progress: () => store.get(),
      async seek(p, o) {
        const v = clamp01(p);
        store.seek(v);
        const stage = stageRef.current;
        stage?.setAttribute("data-progress", v.toFixed(4)); // also in the static layout, where nothing follows scroll
        if (o.scroll && live) {
          const r = root.getBoundingClientRect();
          window.scrollTo({ top: scrollTopFor(v, r.top + window.scrollY, r.height, window.innerHeight), behavior: "instant" });
        }
      },
    });
  }, [id, store, live]);

  const ctx = useMemo<RunwayContextValue>(() => ({ id, scene, store, live, settle, scrollToProgress }), [id, scene, store, live, settle, scrollToProgress]);

  return (
    <RunwayContext.Provider value={ctx}>
      <section
        ref={rootRef}
        id={id}
        aria-label={label}
        data-runway=""
        data-runway-state={live ? "live" : "pending"}
        {...(tag ? { "data-signature": tag, "data-scene-signature": tag } : {})}
        className={cn("ik-runway", className)}
        style={{ "--runway": length, ...style } as CSSProperties}
        {...props}
      >
        <noscript>
          <style>{"[data-runway]{min-block-size:0}[data-preloader]{display:none}"}</style>
        </noscript>
        <div ref={stageRef} className="ik-stage" data-runway-stage="" data-scene={scene} data-scene-id={id} data-progress="0" data-ready={scene === "none" || settled ? "true" : "false"} data-state={scene === "none" || settled ? "static" : "loading"}>
          {media ? (
            <div className="ik-media" data-stage-media="">
              {media}
            </div>
          ) : null}
          <div className="ik-beats" data-stage-beats="">
            {children}
          </div>
        </div>
      </section>
    </RunwayContext.Provider>
  );
}

export interface BeatProps extends Omit<ComponentProps<"div">, "id"> {
  /** First progress (0..1) at which this text is on screen. */
  from: number;
  /** Last progress at which it is on screen. */
  to: number;
  /** Chapter anchor: the element gets the id `<runway id>-<chapter>`, so a chapter link works with no JavaScript. */
  chapter?: string;
  as?: "div" | "section" | "article";
}

/**
 * A piece of real text (a heading, a paragraph, a link) that is on screen while the runway's progress is between `from` and `to`.
 * It is always in the document: crawlers and screen readers read every beat in order, and with no JavaScript, under reduced motion or
 * Save-Data the beats are ordinary blocks in normal flow. Moving focus into a beat scrolls the runway to it.
 * Sets `data-beat-state` (before | active | after) and `--beat-t` (0..1 through its own range) on its element.
 */
export function Beat({ from, to, chapter, as: Tag = "div", className, children, onFocusCapture, ...props }: BeatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { id, store, live, scrollToProgress } = useRunway();
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);

  useEffect(() => {
    const el = ref.current;
    if (!el || !live) return;
    let last = "";
    const apply = (p: number): void => {
      const state = p < lo ? "before" : p > hi ? "after" : "active";
      if (state !== last) {
        last = state;
        el.setAttribute("data-beat-state", state);
      }
      el.style.setProperty("--beat-t", String(hi > lo ? clamp01((p - lo) / (hi - lo)) : 1));
    };
    apply(store.get());
    const off = store.subscribe(apply);
    return () => {
      off();
      el.removeAttribute("data-beat-state");
      el.style.removeProperty("--beat-t");
    };
  }, [live, store, lo, hi]);

  return (
    <Tag
      ref={ref as never}
      id={chapter ? `${id}-${chapter}` : undefined}
      data-beat=""
      className={cn("ik-beat", className)}
      onFocusCapture={(e) => {
        onFocusCapture?.(e);
        if (live && ref.current?.getAttribute("data-beat-state") !== "active") scrollToProgress((lo + hi) / 2);
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}

export interface Chapter {
  /** Matches the `chapter` of a Beat, so the link has a real target with no JavaScript. */
  id: string;
  label: string;
  /** Progress (0..1) the page scrolls to. */
  at: number;
}

export interface ChaptersProps extends Omit<ComponentProps<"nav">, "children"> {
  chapters: Chapter[];
  /** Name of the list for screen readers (default "Chapters"). */
  label?: string;
}

/** Chapter markers: a list of links that scroll the runway to a mark (smoothly, natively). The current chapter has aria-current. */
export function Chapters({ chapters, label = "Chapters", className, ...props }: ChaptersProps) {
  const { id, store, live, scrollToProgress } = useRunway();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list || !live) return;
    const apply = (p: number): void => {
      let current = chapters[0]?.id;
      for (const c of chapters) if (p >= c.at - 1e-6) current = c.id;
      for (const a of Array.from(list.querySelectorAll<HTMLAnchorElement>("a[data-chapter]"))) {
        if (a.dataset.chapter === current) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      }
    };
    apply(store.get());
    return store.subscribe(apply);
  }, [live, store, chapters]);

  return (
    <nav aria-label={label} data-chapters="" className={cn("ik-chapters", className)} {...props}>
      <ol ref={listRef}>
        {chapters.map((c) => (
          <li key={c.id}>
            <a
              href={`#${id}-${c.id}`}
              data-chapter={c.id}
              onClick={(e) => {
                if (!live || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                scrollToProgress(c.at);
              }}
            >
              {c.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
