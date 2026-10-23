import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import { SkipLink } from "@/components/core/SkipLink";
import { Button } from "@/components/ui/button";
import { browserStorage, useHotkey } from "@/lib/app";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import { DemoNote } from "./DemoNote";

const MIN_REM = 14;
const MAX_REM = 28;
const DEFAULT_REM = 18;
const WIDTH_KEY = "app-shell:sidebar-width";

// Layout effects warn nowhere in React 19, but they do nothing on the server; this keeps the intent explicit.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const clamp = (rem: number) => Math.min(MAX_REM, Math.max(MIN_REM, rem));
const round = (rem: number) => Math.round(rem * 10) / 10;
const rootRem = () => (typeof document === "undefined" ? 16 : Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);

export interface AppShellProps {
  /** The app or screen name. Shown in the slim top bar on phones, and as the brand when `brand` is not given. */
  title: string;
  /** Navigation: SidebarSection and SidebarItem. Scrolls on its own. */
  sidebar?: ReactNode;
  /** The top of the sidebar: a logo and a name. Defaults to `title`. */
  brand?: ReactNode;
  /** A right column at lg and up (details, members). Below lg it is a drawer from the end side while `panelOpen`: put the toggle button in `header` (hide it at lg with `lg:hidden`). */
  panel?: ReactNode;
  panelOpen?: boolean;
  onPanelOpenChange?: (open: boolean) => void;
  /** Accessible name of the panel (default "Details"). */
  panelLabel?: string;
  /** A bar above the content: the screen title, tabs, buttons. The page's h1 belongs in the content or here. */
  header?: ReactNode;
  children: ReactNode;
  /** Show the account menu in the sidebar footer (default true). Needs a demo app. */
  account?: boolean;
  /** Show "Demo data, stored in this browser" in the sidebar footer (default true). Keep it. */
  demoNote?: boolean;
}

/**
 * The frame of an app screen: a resizable sidebar (a drawer below md), the content with an optional header, an optional right panel.
 * It owns the page's one <main id="main">. Everything the browser decides (saved sidebar width) is applied after mount, so the
 * server render and the first client render are identical. Put <Seo noindex> OUTSIDE it, and wrap it in <AuthGate>.
 */
export function AppShell({
  title,
  sidebar,
  brand,
  panel,
  panelOpen = false,
  onPanelOpenChange,
  panelLabel = "Details",
  header,
  children,
  account = true,
  demoNote = true,
}: AppShellProps) {
  const uid = useId();
  const asideId = `${uid}-sidebar`;
  const rootRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const widthRef = useRef(DEFAULT_REM);
  const [width, setWidthState] = useState(DEFAULT_REM);
  const [dragging, setDragging] = useState(false);
  // The drawer is open for ONE location: navigating anywhere closes it without an effect.
  const { pathname, search } = useLocation();
  const here = `${pathname}${search}`;
  const [openAt, setOpenAt] = useState<string | null>(null);
  const drawerOpen = openAt === here;

  const setWidth = (rem: number) => {
    const next = clamp(rem);
    widthRef.current = next;
    setWidthState(next);
  };
  const saveWidth = () => {
    try {
      browserStorage()?.setItem(WIDTH_KEY, String(round(widthRef.current)));
    } catch {
      /* not saved */
    }
  };

  useIsoLayoutEffect(() => {
    try {
      const saved = Number.parseFloat(browserStorage()?.getItem(WIDTH_KEY) ?? "");
      if (Number.isFinite(saved)) setWidth(saved);
    } catch {
      /* storage blocked: the default width stays */
    }
  }, []);

  // Growing past the drawer breakpoint leaves nothing to close.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 48rem)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpenAt(null);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Focus moves into the drawer when it opens and back to the menu button when it closes.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (drawerOpen) asideRef.current?.focus();
    else if (wasOpen.current && (!document.activeElement || document.activeElement === document.body || asideRef.current?.contains(document.activeElement))) {
      menuRef.current?.focus();
    }
    wasOpen.current = drawerOpen;
  }, [drawerOpen]);

  useHotkey(
    "escape",
    () => {
      if (drawerOpen) setOpenAt(null);
      else if (panelOpen && !window.matchMedia("(min-width: 64rem)").matches) onPanelOpenChange?.(false);
    },
    { enabled: drawerOpen || panelOpen, allowInInputs: true, preventDefault: false },
  );

  const resizeTo = (clientX: number) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const rtl = getComputedStyle(root).direction === "rtl";
    setWidth((rtl ? rect.right - clientX : clientX - rect.left) / rootRem());
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging) resizeTo(event.clientX);
  };
  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    saveWidth();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rtl = rootRef.current ? getComputedStyle(rootRef.current).direction === "rtl" : false;
    const step = event.shiftKey ? 4 : 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = widthRef.current + (rtl ? -step : step);
    else if (event.key === "ArrowLeft") next = widthRef.current + (rtl ? step : -step);
    else if (event.key === "Home") next = MIN_REM;
    else if (event.key === "End") next = MAX_REM;
    if (next === null) return;
    event.preventDefault();
    setWidth(next);
    saveWidth();
  };

  const closePanel = () => onPanelOpenChange?.(false);

  return (
    <div
      ref={rootRef}
      data-app-shell
      data-panel={panel ? "true" : "false"}
      data-dragging={dragging}
      style={{ "--app-sidebar-w": `${width}rem` } as CSSProperties}
      className={cn(
        "relative grid h-dvh grid-cols-1 grid-rows-1 overflow-hidden bg-bg text-fg data-[dragging=true]:select-none md:grid-cols-[var(--app-sidebar-w)_minmax(0,1fr)]",
        "lg:data-[panel=true]:grid-cols-[var(--app-sidebar-w)_minmax(0,1fr)_20rem]",
      )}
    >
      <SkipLink />

      <aside
        id={asideId}
        ref={asideRef}
        tabIndex={-1}
        aria-label="Navigation"
        data-app-sidebar
        data-open={drawerOpen}
        className={cn(
          "fixed inset-y-0 start-0 z-40 flex w-80 max-w-[85vw] flex-col border-e border-line bg-surface shadow-lg transition-[translate,visibility] duration-(--duration-base) ease-out focus:outline-none",
          "md:static md:z-auto md:w-auto md:max-w-none md:shadow-none",
          drawerOpen ? "max-md:translate-x-0" : "max-md:invisible max-md:-translate-x-full max-md:rtl:translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
          <div className="min-w-0 flex-1 truncate font-display text-base font-semibold text-fg">{brand ?? title}</div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close navigation" className="size-8 md:hidden" onClick={() => setOpenAt(null)}>
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">{sidebar}</div>
        {account || demoNote ? (
          <div className="flex shrink-0 flex-col gap-1 border-t border-line p-2">
            {account ? <AccountMenu /> : null}
            {demoNote ? <DemoNote className="px-2 pb-1" /> : null}
          </div>
        ) : null}
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-controls={asideId}
        aria-valuemin={MIN_REM}
        aria-valuemax={MAX_REM}
        aria-valuenow={round(width)}
        aria-valuetext={`${round(width)} rem wide`}
        tabIndex={0}
        data-app-resizer
        data-dragging={dragging}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onDoubleClick={() => {
          setWidth(DEFAULT_REM);
          saveWidth();
        }}
        style={{ insetInlineStart: "var(--app-sidebar-w)" }}
        className="absolute inset-y-0 z-20 hidden w-1.5 -translate-x-1/2 cursor-col-resize touch-none transition-colors duration-(--duration-fast) hover:bg-accent/30 focus-visible:bg-accent/40 data-[dragging=true]:bg-accent/40 md:block rtl:translate-x-1/2"
      />

      <div className="flex min-h-0 min-w-0 flex-col" inert={drawerOpen}>
        <div data-app-topbar className="flex h-12 shrink-0 items-center gap-1 border-b border-line bg-bg px-2 md:hidden">
          <Button
            ref={menuRef}
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls={asideId}
            onClick={() => setOpenAt(here)}
          >
            <Menu aria-hidden="true" />
          </Button>
          <span className="min-w-0 flex-1 truncate font-display text-base font-semibold text-fg">{title}</span>
        </div>
        <main id="main" tabIndex={-1} data-app-main className="flex min-h-0 flex-1 flex-col focus:outline-none">
          {header}
          <div data-app-content className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {children}
          </div>
        </main>
      </div>

      {panel ? (
        <>
          {panelOpen ? (
            <button
              type="button"
              aria-label="Close panel"
              tabIndex={-1}
              data-app-backdrop
              onClick={closePanel}
              className="fixed inset-0 z-30 bg-fg/40 lg:hidden"
            />
          ) : null}
          <aside
            aria-label={panelLabel}
            data-app-panel
            data-open={panelOpen}
            className={cn(
              "fixed inset-y-0 end-0 z-40 flex w-96 max-w-[90vw] flex-col overflow-y-auto border-s border-line bg-bg shadow-lg transition-[translate,visibility] duration-(--duration-base) ease-out",
              "lg:static lg:z-auto lg:w-auto lg:max-w-none lg:shadow-none",
              panelOpen ? "max-lg:translate-x-0" : "max-lg:invisible max-lg:translate-x-full max-lg:rtl:-translate-x-full",
            )}
          >
            <div className="flex h-12 shrink-0 items-center justify-end px-2 lg:hidden">
              <Button type="button" variant="ghost" size="icon" aria-label="Close panel" className="size-8" onClick={closePanel}>
                <X aria-hidden="true" />
              </Button>
            </div>
            {panel}
          </aside>
        </>
      ) : null}

      {drawerOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          tabIndex={-1}
          data-app-backdrop
          onClick={() => setOpenAt(null)}
          className="fixed inset-0 z-30 bg-fg/40 md:hidden"
        />
      ) : null}
    </div>
  );
}
