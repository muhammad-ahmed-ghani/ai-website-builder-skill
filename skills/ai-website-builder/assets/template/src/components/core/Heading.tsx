import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingSize = "hero" | "5xl" | "4xl" | "3xl" | "2xl" | "xl" | "lg" | "base";

const sizes: Record<HeadingSize, string> = {
  hero: "text-hero",
  "5xl": "text-5xl",
  "4xl": "text-4xl",
  "3xl": "text-3xl",
  "2xl": "text-2xl",
  xl: "text-xl",
  lg: "text-lg",
  base: "text-base",
};

const defaultSize: Record<HeadingLevel, HeadingSize> = { 1: "5xl", 2: "3xl", 3: "2xl", 4: "xl", 5: "lg", 6: "base" };

export interface HeadingProps extends ComponentProps<"h2"> {
  /** Semantic level. One level-1 per page, never skip levels. */
  level?: HeadingLevel;
  /** Visual size, independent of the level. Defaults by level. */
  size?: HeadingSize;
  /** "display" uses font-display, "text" uses font-sans. */
  variant?: "display" | "text";
}

/** Semantic level and visual size are separate on purpose: pick the level for the outline, the size for the look. */
export function Heading({ level = 2, size, variant = "display", className, ...props }: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag
      className={cn(
        "font-semibold text-balance",
        variant === "display" ? "font-display" : "font-sans",
        sizes[size ?? defaultSize[level]],
        className,
      )}
      {...props}
    />
  );
}
