import { useRef, type ComponentProps, type CSSProperties, type ElementType } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "./useInView";

export interface StaggerProps extends ComponentProps<"ul"> {
  as?: ElementType;
  /** Milliseconds between one child and the next (default 60). */
  step?: number;
}

/**
 * Recipe `stagger`: the children of a list, grid or row arrive one after another when the group scrolls into view, instead of
 * as one block. Put it on the CONTAINER, not on each child. Up to 12 children are staggered; later ones arrive with the last.
 * Block-axis movement only (no left or right), so it reads the same in right-to-left languages. Timing comes from the
 * --duration-slow and --ease-out tokens; nothing is hidden before hydration or under prefers-reduced-motion.
 */
export function Stagger({ as: Tag = "ul", step = 60, className, style, ...props }: StaggerProps) {
  const ref = useRef<HTMLElement>(null);
  useInView(ref, {
    onBelowFold: (el) => {
      el.dataset.staggerState = "hidden";
    },
    onEnter: (el) => {
      el.dataset.staggerState = "shown";
    },
    onCleanup: (el) => {
      delete el.dataset.staggerState;
    },
  });
  return <Tag ref={ref} data-stagger="" className={cn(className)} style={{ "--stagger-step": `${step}ms`, ...style } as CSSProperties} {...props} />;
}
