import type { ComponentProps, ElementType } from "react";
import { cn } from "@/lib/utils";

export type ContainerWidth = "narrow" | "default" | "wide" | "full";

const widths: Record<ContainerWidth, string> = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

export interface ContainerProps extends ComponentProps<"div"> {
  /** Element to render, default div. */
  as?: ElementType;
  width?: ContainerWidth;
}

/** Centred column with responsive side gutters. Every section's content lives in one of these. */
export function Container({ as: Tag = "div", width = "default", className, ...props }: ContainerProps) {
  return <Tag className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", widths[width], className)} {...props} />;
}
