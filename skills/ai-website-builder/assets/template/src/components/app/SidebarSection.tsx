import { useEffect, useId, useState, type MouseEventHandler, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { browserStorage } from "@/lib/app";
import { cn } from "@/lib/utils";

export interface SidebarSectionProps {
  /** Stable id: the open state is remembered per id in this browser. */
  id: string;
  title: string;
  /** How many items the section has, shown quietly next to the title. */
  count?: number;
  /** Unread items inside. Shown as a count when the section is collapsed. */
  unread?: number;
  defaultOpen?: boolean;
  /** A small button at the end of the header (add, filter). */
  action?: ReactNode;
  children: ReactNode;
}

const storageKey = (id: string) => `app-sidebar-section:${id}`;

/**
 * A collapsible group in the sidebar. Collapse state is saved per id in localStorage AFTER mount (the server and the first client
 * render always use `defaultOpen`). No drag and drop. The animation is off under reduced motion (global rule).
 */
export function SidebarSection({ id, title, count, unread = 0, defaultOpen = true, action, children }: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const uid = useId();
  const buttonId = `${uid}-button`;
  const panelId = `${uid}-panel`;

  useEffect(() => {
    try {
      const saved = browserStorage()?.getItem(storageKey(id));
      if (saved === "0") setOpen(false);
      else if (saved === "1") setOpen(true);
    } catch {
      /* storage blocked: keep the default */
    }
  }, [id]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      browserStorage()?.setItem(storageKey(id), next ? "1" : "0");
    } catch {
      /* not saved, still collapsed for this visit */
    }
  };

  return (
    <section data-sidebar-section={id} aria-labelledby={buttonId} className="py-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-2 py-1 text-start text-xs font-medium text-muted transition-colors duration-(--duration-fast) hover:text-fg"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn("size-3.5 shrink-0 transition-transform duration-(--duration-base) ease-out", !open && "-rotate-90 rtl:rotate-90")}
          />
          <span className="truncate">{title}</span>
          {count !== undefined ? <span className="ms-1 font-normal tabular-nums">{count}</span> : null}
          {!open && unread > 0 ? (
            <Badge className="ms-auto px-1.5 py-0 tabular-nums">
              {unread}
              <span className="sr-only"> unread</span>
            </Badge>
          ) : null}
        </button>
        {action}
      </div>
      <div
        id={panelId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-(--duration-base) ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-0.5 pt-0.5">{children}</div>
        </div>
      </div>
    </section>
  );
}

export interface SidebarItemProps {
  /** An in-app path. Renders a link; without it a button. */
  to?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  /** The current item. Without it, a `to` item is current when the path matches. */
  active?: boolean;
  /** Fades the row (a muted channel, an archived item). */
  muted?: boolean;
  /** Makes the label semibold and shows the count. */
  unread?: number;
  icon?: ReactNode;
  children: ReactNode;
  /** Anything at the end of the row (a status dot, a lock). */
  trailing?: ReactNode;
  className?: string;
}

/** One row of the sidebar: a router link when it has `to`, a button when it does not. `aria-current="page"` marks the active one. */
export function SidebarItem({ to, onClick, active, muted = false, unread = 0, icon, children, trailing, className }: SidebarItemProps) {
  const hasUnread = unread > 0;
  const classes = cn(
    "flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-start text-sm text-fg transition-colors duration-(--duration-fast) hover:bg-surface-2 aria-[current=page]:bg-accent-soft aria-[current=page]:font-medium",
    muted && !hasUnread && "text-muted",
    hasUnread && "font-semibold",
    className,
  );
  const body = (
    <>
      {icon ? (
        <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center text-muted [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hasUnread ? (
        <Badge className="px-1.5 py-0 tabular-nums">
          {unread}
          <span className="sr-only"> unread</span>
        </Badge>
      ) : null}
      {trailing}
    </>
  );
  if (to === undefined) {
    return (
      <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} data-sidebar-item className={classes}>
        {body}
      </button>
    );
  }
  if (active === undefined) {
    return (
      <NavLink to={to} end={to === "/"} onClick={onClick} data-sidebar-item className={classes}>
        {body}
      </NavLink>
    );
  }
  return (
    <Link to={to} onClick={onClick} aria-current={active ? "page" : undefined} data-sidebar-item className={classes}>
      {body}
    </Link>
  );
}
