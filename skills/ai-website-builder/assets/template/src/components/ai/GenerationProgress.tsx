import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import type { AiError, AiProgress } from "@/lib/ai";
import { cn } from "@/lib/utils";
import type { AiJobStatus } from "./useAiJob";

export interface GenerationProgressProps extends Omit<ComponentProps<"div">, "children"> {
  status: AiJobStatus;
  progress?: AiProgress | null;
  error?: AiError | null;
  /** Shown while working, for example "Generating your image". */
  label?: string;
  onCancel?: () => void;
  /** Offered after a failure or cancellation. */
  onRetry?: () => void;
}

function queueText(progress: AiProgress | null | undefined, label: string): string {
  if (progress?.phase === "queued" && progress.queuePosition !== undefined && progress.queuePosition > 0) {
    return `Waiting in line, ${progress.queuePosition} ahead of you`;
  }
  if (progress?.phase === "queued") return "Waiting to start";
  return label;
}

/**
 * Status UI for an AI job: an announced progress message with an indeterminate bar and a cancel button while
 * it runs, a readable alert with a retry button when it fails. Renders nothing when idle or succeeded, so the
 * caller shows the result itself. Fal does not report a percentage, so the bar is honest about being indeterminate.
 */
export function GenerationProgress({
  status,
  progress,
  error,
  label = "Generating",
  onCancel,
  onRetry,
  className,
  ...props
}: GenerationProgressProps) {
  if (status === "queued" || status === "running") {
    const lastLog = progress?.logs.at(-1);
    return (
      <div role="status" aria-live="polite" aria-busy="true" className={cn("grid gap-3", className)} {...props}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-fg">{queueText(progress, label)}&hellip;</p>
          {onCancel ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
        <div role="progressbar" aria-label={label} className="relative h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="absolute inset-y-0 w-1/3 animate-indeterminate rounded-full bg-accent" />
        </div>
        {lastLog ? <p className="truncate text-xs text-muted">{lastLog}</p> : null}
      </div>
    );
  }

  if (status === "failed" && error) {
    return (
      <div role="alert" className={cn("grid gap-3 rounded-md border border-danger p-4", className)} {...props}>
        <p className="text-sm text-fg">{error.userMessage}</p>
        {onRetry && error.retryable ? (
          <div>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div role="status" className={cn("flex items-center gap-3", className)} {...props}>
        <p className="text-sm text-muted">Cancelled.</p>
        {onRetry ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
            Start again
          </Button>
        ) : null}
      </div>
    );
  }

  return null;
}
