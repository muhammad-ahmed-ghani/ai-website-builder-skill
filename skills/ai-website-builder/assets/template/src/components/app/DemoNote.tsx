import { cn } from "@/lib/utils";

export interface DemoNoteProps {
  /** Adds a small "Reset" button after the line. */
  onReset?: () => void;
  className?: string;
}

/** The quiet line that keeps an app honest: everything in it is demo data kept in this browser. AppShell shows it. */
export function DemoNote({ onReset, className }: DemoNoteProps) {
  return (
    <p data-demo-note className={cn("text-xs text-muted", className)}>
      Demo data, stored in this browser
      {onReset ? (
        <>
          {" "}
          <button type="button" onClick={onReset} className="underline underline-offset-2 hover:text-fg">
            Reset
          </button>
        </>
      ) : null}
    </p>
  );
}
