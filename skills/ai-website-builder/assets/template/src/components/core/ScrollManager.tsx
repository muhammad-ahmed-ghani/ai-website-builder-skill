import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Scrolls to the top on route changes and to the target on hash links. Renders nothing. */
export function ScrollManager() {
  const { pathname, hash } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(safeDecode(hash.slice(1)));
      if (target) {
        target.scrollIntoView();
        first.current = false;
        return;
      }
    }
    if (first.current) {
      first.current = false; // initial load: leave the browser's own scroll restoration alone
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}
