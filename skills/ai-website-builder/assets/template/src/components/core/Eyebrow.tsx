import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export interface EyebrowProps extends ComponentProps<"p"> {
  /** Uppercase with wider tracking. */
  caps?: boolean;
}

/** Short label above a heading. Not a heading itself. */
export function Eyebrow({ caps = false, className, ...props }: EyebrowProps) {
  return <p className={cn("text-sm font-medium text-muted", caps && "tracking-wider uppercase", className)} {...props} />;
}
