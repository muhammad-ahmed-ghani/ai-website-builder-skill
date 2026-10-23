import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Loading placeholder. Pulses unless the visitor prefers reduced motion (see index.css). */
function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn("animate-pulse rounded-md bg-surface-2", className)} {...props} />;
}

export { Skeleton };
