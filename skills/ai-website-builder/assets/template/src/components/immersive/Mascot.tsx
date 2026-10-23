import { useEffect, type ComponentProps } from "react";
import { withBase } from "@/lib/base";
import { cn } from "@/lib/utils";
import { Img } from "../core/Img";
import { useInViewFlag, useSceneBox } from "./scene";
import type { ImmersiveRecipe, MascotBehaviour, MascotEntry } from "./types";
import "./immersive.css";

export interface MascotProps extends Omit<ComponentProps<"div">, "id" | "children">, Omit<MascotEntry, "kind"> {
  kind?: "mascot";
  /** The pose is the largest contentful paint of the page: eager (default false: a mascot is rarely the first thing). */
  priority?: boolean;
  signature?: ImmersiveRecipe | false;
}

const ELEMENTS = new Set(["svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "defs", "lineargradient", "radialgradient", "stop", "clippath", "mask", "title", "desc", "symbol", "use"]);
const BEHAVIOURS: readonly MascotBehaviour[] = ["blink", "bob", "wave", "sway", "wag", "breathe"];

/**
 * Parse a vector file into an <svg> element we are willing to put in the page: a short list of drawing elements, no scripts, no event
 * handlers, no links except to an id in the same file, no external references in styles. Returns null for anything else. The platform
 * has already linted the file when it made it (same rules); this is the second lock.
 */
export function parseMascotSvg(text: string): SVGSVGElement | null {
  if (text.length > 120_000) return null;
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.localName !== "svg" || doc.querySelector("parsererror")) return null;
  const walk = (el: Element): boolean => {
    if (!ELEMENTS.has(el.localName.toLowerCase())) return false;
    for (const a of Array.from(el.attributes)) {
      const name = a.name.toLowerCase();
      const v = a.value;
      const bad =
        name.startsWith("on") ||
        ((name === "href" || name === "xlink:href") && !v.startsWith("#")) ||
        (/url\(/i.test(v) && !/url\(\s*["']?#/i.test(v)) ||
        /javascript:|data:|@import|expression\(/i.test(v);
      if (bad) el.removeAttribute(a.name);
    }
    for (const child of Array.from(el.children)) if (!walk(child)) child.remove();
    return true;
  };
  if (!walk(root)) return null;
  return document.importNode(root, true) as unknown as SVGSVGElement;
}

/**
 * Recipe `mascot`: an animated vector character. The still pose is an <Img> in the markup (server render, no JavaScript, reduced motion
 * and Save-Data keep it, and it is what screen readers and crawlers get). After hydration, for a visitor who allows motion, the vector
 * file replaces it inline, and the named parts move with CSS only (blink, bob, wave, sway, wag, breathe): `parts` says which element ids
 * do what. No library, nothing runs off screen, nothing runs under reduced motion.
 */
export function Mascot({ id, alt, svg, pose, parts, priority = false, signature, kind: _kind, className, ...props }: MascotProps) {
  const { ref, live, settle } = useSceneBox<HTMLDivElement>();
  const tag = signature === false ? undefined : (signature ?? "mascot");
  useInViewFlag(ref, live);

  useEffect(() => {
    const host = ref.current;
    if (!live || !host) return;
    const ctl = new AbortController();
    void (async () => {
      try {
        const res = await fetch(withBase(svg), { signal: ctl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const el = parseMascotSvg(await res.text());
        if (!el || ctl.signal.aborted) throw new Error("not a usable vector file");
        el.setAttribute("role", "img");
        el.setAttribute("aria-label", alt);
        el.setAttribute("focusable", "false");
        el.removeAttribute("width");
        el.removeAttribute("height");
        for (const b of BEHAVIOURS) {
          for (const part of parts[b] ?? []) {
            const target = el.querySelector(`[id="${part.replace(/"/g, "")}"]`);
            if (target) target.setAttribute("data-motion", b);
          }
        }
        host.setAttribute("data-mascot-live", "");
        host.replaceChildren(el);
        settle("live");
      } catch {
        if (!ctl.signal.aborted) settle("error"); // the still pose stays
      }
    })();
    return () => ctl.abort();
    // the entry does not change while mounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  return (
    <div
      ref={ref}
      data-mascot=""
      data-scene="none"
      data-scene-id={id}
      data-progress="0"
      data-ready="false"
      data-state="loading"
      {...(tag ? { "data-signature": tag, "data-scene-signature": tag } : {})}
      className={cn("ik-mascot", className)}
      {...props}
    >
      <Img {...pose} alt={alt} sizes="(min-width: 1024px) 30vw, 60vw" priority={priority} className="ik-mascot-pose" />
    </div>
  );
}
