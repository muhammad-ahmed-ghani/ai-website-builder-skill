import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Container, type ContainerWidth } from "./Container";

export type SectionTone = "default" | "surface" | "inverse";

/*
 * The inverse tone flips fg and bg. Muted text and lines are re-derived inside it (scoped CSS variables built
 * from the same tokens), so text-muted and border-line keep working inside an inverse section.
 */
const tones: Record<SectionTone, string> = {
  default: "bg-bg text-fg",
  surface: "bg-surface text-fg",
  inverse:
    "bg-fg text-bg [--color-line:color-mix(in_oklab,var(--color-bg)_28%,transparent)] [--color-muted:color-mix(in_oklab,var(--color-bg)_72%,transparent)]",
};

export interface SectionProps extends ComponentProps<"section"> {
  tone?: SectionTone;
  /** Width of the inner Container. */
  width?: ContainerWidth;
  /** Skip the inner Container (for full-bleed media). */
  bleed?: boolean;
}

/**
 * One band of a page. Vertical rhythm comes from the py-section token, so a new direction re-spaces every page.
 * Give it an id for in-page links, and aria-labelledby pointing at its Heading id.
 */
export function Section({ tone = "default", width, bleed = false, className, children, ...props }: SectionProps) {
  return (
    <section className={cn("py-section", tones[tone], className)} {...props}>
      {bleed ? children : <Container width={width}>{children}</Container>}
    </section>
  );
}
