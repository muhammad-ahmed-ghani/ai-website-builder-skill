import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Img, type ImgProps } from "../core/Img";
import { useInViewFlag, useSceneBox } from "./scene";
import type { ImmersiveRecipe } from "./types";
import type { ShaderEngine } from "./engines/shader";
import "./immersive.css";

export interface ShaderHeroProps extends Omit<ComponentProps<"section">, "id" | "children"> {
  /** Names the scene for the capture contract. */
  id: string;
  /** What the region is, for screen readers. */
  label: string;
  /** A preset name (`flow`, `grain`, `contours`) or the source of a fragment shader (GLSL ES 1.00, uniforms in engines/shaders.ts). Default `flow`. */
  shader?: string;
  /** The static picture: shown on the server, with no JavaScript, under reduced motion and Save-Data, and whenever WebGL is missing, slow or lost. Required. */
  fallback: Pick<ImgProps, "src" | "width" | "height" | "sources" | "blur"> & { alt?: string };
  /** Frames per second (default 30) and the share of device resolution to render at (default 0.75). */
  fps?: number;
  scale?: number;
  priority?: boolean;
  signature?: ImmersiveRecipe | false;
  /** The hero's real text (the h1, the sub-line, the action). Always in the document. */
  children?: ReactNode;
}

/**
 * Recipe `shader-hero`: a small fragment shader as the hero's background, plain WebGL, no library. The engine is a separate chunk
 * loaded after hydration. It refuses software renderers, draws at a capped size and rate, and stops when it is off screen or the tab is
 * hidden. The hero is at least one screen tall; the text is HTML over it.
 */
export function ShaderHero({ id, label, shader = "flow", fallback, fps, scale, priority = true, signature, className, children, ...props }: ShaderHeroProps) {
  const { ref, live, settle } = useSceneBox<HTMLElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ShaderEngine | undefined>(undefined);
  const [shown, setShown] = useState(false);
  const tag = signature === false ? undefined : (signature ?? "shader-hero");

  useInViewFlag(ref, live, (v) => engineRef.current?.setVisible(v));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!live || !canvas) return;
    let cancelled = false;
    let off: (() => void) | undefined;
    const timer = setTimeout(() => {
      if (!cancelled && ref.current?.getAttribute("data-ready") !== "true") {
        engineRef.current?.destroy();
        settle("timeout");
      }
    }, 6000);
    import("./engines/shader")
      .then(({ startShader }) => {
        if (cancelled) return;
        engineRef.current = startShader({
          canvas,
          shader,
          ...(fps ? { fps } : {}),
          ...(scale ? { scale } : {}),
          onReady: () => {
            clearTimeout(timer);
            setShown(true);
            settle("live");
          },
          onError: () => {
            clearTimeout(timer);
            engineRef.current?.destroy();
            engineRef.current = undefined;
            settle("error");
          },
        });
        const el = ref.current;
        const move = (e: PointerEvent): void => {
          const r = canvas.getBoundingClientRect();
          engineRef.current?.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2);
        };
        if (el && window.matchMedia("(hover: hover)").matches) {
          el.addEventListener("pointermove", move, { passive: true });
          off = () => el.removeEventListener("pointermove", move);
        }
      })
      .catch(() => settle("error"));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      off?.();
      engineRef.current?.destroy();
      engineRef.current = undefined;
    };
    // the shader and its settings do not change while mounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  return (
    <section
      ref={ref}
      id={id}
      aria-label={label}
      data-shader-hero=""
      data-scene="shader"
      data-scene-id={id}
      data-progress="0"
      data-ready="false"
      data-state="loading"
      {...(tag ? { "data-signature": tag, "data-scene-signature": tag } : {})}
      className={cn("ik-hero", className)}
      {...props}
    >
      <div className="ik-media">
        <Img {...fallback} alt={fallback.alt ?? ""} sizes="100vw" priority={priority} className="ik-fill" />
        <canvas ref={canvasRef} aria-hidden="true" className="ik-canvas" data-shown={shown ? "true" : "false"} />
      </div>
      <div className="ik-overlay">{children}</div>
    </section>
  );
}
