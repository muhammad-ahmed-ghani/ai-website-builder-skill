import { useEffect, useRef, type ComponentProps, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { Img } from "../core/Img";
import { readMediaPolicy } from "./policy";
import type { CutOutEntry, ImmersiveRecipe } from "./types";
import "./immersive.css";

export interface CutOutProps extends Omit<ComponentProps<"div">, "id" | "children">, Omit<CutOutEntry, "kind"> {
  kind?: "cutout";
  /** How far it travels with the pointer and the scroll: 0 stays put, 1 moves the most (default 0.5). Nearer layers use a larger depth. */
  depth?: number;
  /** Follow the pointer (default true; never on touch or under reduced motion). */
  pointer?: boolean;
  /** Drift with the scroll position (default true; never under reduced motion). */
  scroll?: boolean;
  /** Straddle the edge of its section: half of it sits outside, over the neighbouring section. The section needs `relative`. */
  edge?: "start" | "end";
  /** Draw it as decoration: empty alt text and hidden from screen readers (default false: the alt text is used). */
  decorative?: boolean;
  /** The sizes attribute for the picture (default "50vw"). */
  sizes?: string;
  signature?: ImmersiveRecipe | false;
}

/** One controller per section: pointer and scroll write CSS variables on it, every cut-out inside reads them. No per-frame React work. */
const scopes = new WeakMap<HTMLElement, { count: number; stop: () => void }>();

function track(scope: HTMLElement, o: { pointer: boolean; scroll: boolean }): () => void {
  const held = scopes.get(scope);
  if (held) {
    held.count++;
    return () => release(scope);
  }
  let raf = 0;
  let px = 0;
  let py = 0;
  let inView = true;
  const write = (): void => {
    raf = 0;
    scope.style.setProperty("--ik-px", px.toFixed(3));
    scope.style.setProperty("--ik-py", py.toFixed(3));
    if (o.scroll) {
      const r = scope.getBoundingClientRect();
      const sy = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      scope.style.setProperty("--ik-sy", Math.max(-1, Math.min(1, sy)).toFixed(3));
    }
  };
  const schedule = (): void => {
    if (!raf && inView) raf = requestAnimationFrame(write);
  };
  const move = (e: PointerEvent): void => {
    const r = scope.getBoundingClientRect();
    px = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
    py = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;
    schedule();
  };
  const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((e) => { inView = e.some((x) => x.isIntersecting); if (inView) schedule(); }, { rootMargin: "10% 0px" });
  io?.observe(scope);
  if (o.pointer) scope.addEventListener("pointermove", move, { passive: true });
  if (o.scroll) {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
  }
  scopes.set(scope, {
    count: 1,
    stop() {
      io?.disconnect();
      scope.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
      for (const v of ["--ik-px", "--ik-py", "--ik-sy"]) scope.style.removeProperty(v);
    },
  });
  return () => release(scope);
}

function release(scope: HTMLElement): void {
  const s = scopes.get(scope);
  if (!s) return;
  if (--s.count <= 0) {
    s.stop();
    scopes.delete(scope);
  }
}

/**
 * Recipe `cutout-depth`: a transparent picture (a background-removed object) layered over a section, optionally straddling the edge
 * into the next one, drifting a little with the pointer and the scroll. The movement is CSS custom properties and a transform with the
 * spring easing token: no per-frame React work, nothing under reduced motion or on touch. The picture is in the markup from the server
 * render, so with no JavaScript it is simply a still image in place. Place it with `className` (absolute positioning inside a `relative`
 * section) and give it a width: `<CutOut {...immersive["skull"]} className="end-0 bottom-0 w-1/3" edge="end" />`.
 */
export function CutOut({ id, alt, image, depth = 0.5, pointer = true, scroll = true, edge, decorative = false, sizes = "50vw", signature, kind: _kind, className, style, ...props }: CutOutProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tag = signature === false ? undefined : (signature ?? "cutout-depth");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const policy = readMediaPolicy();
    if (!policy.motion || depth <= 0) return;
    const coarse = window.matchMedia("(hover: none)").matches;
    const scope = (el.closest("section") ?? el.parentElement) as HTMLElement | null;
    if (!scope) return;
    el.setAttribute("data-cutout-live", "");
    const stop = track(scope, { pointer: pointer && !coarse, scroll });
    return () => {
      el.removeAttribute("data-cutout-live");
      stop();
    };
  }, [depth, pointer, scroll]);

  return (
    <div
      ref={ref}
      data-cutout=""
      data-scene="none"
      data-scene-id={id}
      data-progress="0"
      data-ready="true"
      data-state="static"
      {...(edge ? { "data-edge": edge } : {})}
      {...(tag ? { "data-signature": tag, "data-scene-signature": tag } : {})}
      {...(decorative ? { "aria-hidden": true } : {})}
      className={cn("ik-cutout", className)}
      style={{ "--ik-depth": depth, ...style } as CSSProperties}
      {...props}
    >
      <Img {...image} alt={decorative ? "" : alt} sizes={sizes} className="ik-cutout-img" imgClassName="object-contain" />
    </div>
  );
}
