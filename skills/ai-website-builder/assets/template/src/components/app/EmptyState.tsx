import type { ReactNode } from "react";
import { Heading } from "@/components/core/Heading";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Usually a Button or a Link. */
  action?: ReactNode;
  /** A small lucide icon, shown in a quiet circle. Ignored when `art` is given. */
  icon?: ReactNode;
  /** A generated picture (an <Img>), never a picture with text in it. */
  art?: ReactNode;
  /** Heading level of the title (default 2). */
  level?: 2 | 3 | 4;
  className?: string;
}

/** What a list, table or panel shows when there is nothing in it yet, or nothing matches. Say what happens next. */
export function EmptyState({ title, description, action, icon, art, level = 2, className }: EmptyStateProps) {
  return (
    <div data-empty-state className={cn("mx-auto flex max-w-sm flex-col items-center gap-3 px-4 py-12 text-center", className)}>
      {art ? (
        <div className="w-full max-w-56">{art}</div>
      ) : icon ? (
        <div aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-surface-2 text-muted [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <Heading level={level} size="lg">
        {title}
      </Heading>
      {description ? <p className="text-sm text-pretty text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
