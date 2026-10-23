import { useCallback, useEffect, useRef, useState } from "react";
import { allowsMotionMedia, readMediaPolicy, type MediaPolicy } from "./policy";

export type SceneState = "live" | "static" | "timeout" | "error";

/**
 * What a scene outside a runway (a looping video, a shader, a cut-out, a mascot) needs: a box that carries the capture attributes,
 * the decision (after hydration) whether this visitor gets motion media, and a way to say the scene has settled.
 */
export function useSceneBox<T extends HTMLElement>(allow: (p: MediaPolicy) => boolean = allowsMotionMedia) {
  const ref = useRef<T>(null);
  const [live, setLive] = useState(false);
  const settle = useCallback((state: SceneState) => {
    ref.current?.setAttribute("data-state", state);
    ref.current?.setAttribute("data-ready", "true");
  }, []);
  useEffect(() => {
    const on = allow(readMediaPolicy());
    setLive(on);
    if (!on) settle("static"); // the poster is the scene
  }, [allow, settle]);
  return { ref, live, settle };
}

/** Marks the element `data-in-view` while it is on screen (with some margin), so media can pause when it is not. */
export function useInViewFlag(ref: React.RefObject<HTMLElement | null>, on: boolean, onChange?: (inView: boolean) => void): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !on || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const v = entries.some((e) => e.isIntersecting);
        el.setAttribute("data-in-view", String(v));
        onChange?.(v);
      },
      { rootMargin: "20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // `onChange` is created inline by the scenes and only used while mounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, on]);
}
