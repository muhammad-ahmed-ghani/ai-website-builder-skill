import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** First focusable element on every page. Hidden until it receives keyboard focus. */
export function SkipLink({ href = "#main", className, children = "Skip to main content", ...props }: ComponentProps<"a">) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-bg focus:px-4 focus:py-2 focus:text-fg focus:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
