import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge needs to know the token names from src/styles/tokens.css, otherwise it cannot tell
 * `text-hero` (a size) from `text-fg` (a colour) and drops one of them. Keep this list in sync with the
 * token contract; the names are the same in every generated app.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        "bg",
        "surface",
        "surface-2",
        "fg",
        "muted",
        "line",
        "accent",
        "accent-fg",
        "accent-soft",
        "secondary",
        "secondary-fg",
        "secondary-soft",
        "success",
        "warning",
        "danger",
        "focus",
      ],
      text: ["hero"],
      font: ["display"],
      spacing: ["section"],
    },
  },
});

/** Merge class names; later Tailwind utilities win over earlier conflicting ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
