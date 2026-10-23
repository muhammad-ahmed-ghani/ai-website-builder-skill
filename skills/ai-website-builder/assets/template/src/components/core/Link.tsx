import type { ComponentProps, MouseEvent } from "react";
import { flushSync } from "react-dom";
import { Link as RouterLink, useNavigate } from "react-router";

export interface LinkProps extends Omit<ComponentProps<"a">, "href"> {
  /** "/path" and "/path#id" navigate in-app, "#id" scrolls, "mailto:", "tel:" and "https://..." are plain links. */
  to: string;
  /** Open an absolute URL in a new tab (rel is set for you). */
  newTab?: boolean;
}

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

type Transitioning = Document & { startViewTransition?: (update: () => void) => unknown };

/**
 * One link component for everything, so internal navigation never reloads the page and external links are safe.
 * In-app navigation runs inside a View Transition where the browser has them (the `view-transition` motion recipe): the page
 * cross-fades (src/index.css), and any element with a `view-transition-name` can morph between pages. Never under reduced motion.
 */
export function Link({ to, newTab = false, children, onClick, ...props }: LinkProps) {
  const navigate = useNavigate();
  if (to.startsWith("#")) {
    return (
      <a href={to} onClick={onClick} {...props}>
        {children}
      </a>
    );
  }
  if (EXTERNAL.test(to)) {
    return (
      <a
        href={to}
        onClick={onClick}
        {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...props}
      >
        {children}
        {newTab ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    );
  }
  const onNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    const doc = document as Transitioning;
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !props.target;
    if (event.defaultPrevented || !plain || !doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    doc.startViewTransition(() => flushSync(() => void navigate(to)));
  };
  return (
    <RouterLink to={to} onClick={onNavigate} {...props}>
      {children}
    </RouterLink>
  );
}
