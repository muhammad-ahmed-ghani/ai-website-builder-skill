import type { ComponentProps } from "react";
import { isApplePlatform, useMounted } from "@/lib/app";
import { cn } from "@/lib/utils";

const APPLE: Record<string, string> = {
  mod: "⌘",
  cmd: "⌘",
  meta: "⌘",
  shift: "⇧",
  alt: "⌥",
  option: "⌥",
  ctrl: "⌃",
  enter: "↵",
  escape: "Esc",
  esc: "Esc",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  tab: "⇥",
  backspace: "⌫",
};

const OTHER: Record<string, string> = {
  ...APPLE,
  mod: "Ctrl",
  cmd: "Ctrl",
  meta: "Win",
  shift: "Shift",
  alt: "Alt",
  option: "Alt",
  ctrl: "Ctrl",
  enter: "Enter",
  tab: "Tab",
  backspace: "Backspace",
};

const keyClass =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-line bg-surface px-1 font-mono text-xs leading-none text-muted";

export interface KbdProps extends ComponentProps<"kbd"> {
  /** A shortcut: ["mod", "K"] shows the Command sign on Apple platforms and Ctrl elsewhere. Leave out to render `children` as one key. */
  keys?: readonly string[];
}

/**
 * A keyboard key. The first render (server and hydration) always uses the Ctrl form; the Command form replaces it after mount
 * on Apple platforms, so the markup never differs between server and client.
 */
export function Kbd({ keys, className, children, ...props }: KbdProps) {
  const apple = useMounted() && isApplePlatform();
  if (!keys) {
    return (
      <kbd className={cn(keyClass, className)} {...props}>
        {children}
      </kbd>
    );
  }
  const labels = apple ? APPLE : OTHER;
  return (
    <span data-kbd className="inline-flex items-center gap-1">
      {keys.map((key, index) => (
        <kbd key={`${key}-${index}`} className={cn(keyClass, className)} {...props}>
          {labels[key.toLowerCase()] ?? (key.length === 1 ? key.toUpperCase() : key)}
        </kbd>
      ))}
    </span>
  );
}
