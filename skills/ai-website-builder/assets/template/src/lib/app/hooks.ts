/**
 * React hooks for the app kit. Everything here is safe to render on the server and to hydrate: stores and auth are read with
 * useSyncExternalStore and its SERVER snapshot, so the prerendered HTML and the first client render are identical, and the real
 * (persisted) data arrives one render later.
 */
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useSearchParams } from "react-router";
import { roleAllows, type Auth, type PublicUser, type Role, type SignInResult } from "./auth";
import { getDemoApp } from "./demo";
import { isApplePlatform, isEditableTarget, matchesCombo, parseCombo } from "./hotkey";
import { SEED_EPOCH, type SchemaOf, type Store, type StoreState } from "./store";

const EMPTY: readonly never[] = Object.freeze([]);

/**
 * Read a value derived from the store. Re-renders only when the selected value changes (compared with Object.is).
 * Prefer selectors that return something already in the state (a collection, a row); a selector that builds a new array
 * each time still works, but then the component re-renders whenever it renders.
 */
export function useStore<S extends SchemaOf<S>, T>(store: Store<S>, selector: (state: StoreState<S>) => T): T {
  const cache = useRef<{ state: unknown; selector: unknown; value: T } | null>(null);
  const pick = (state: StoreState<S>): T => {
    const hit = cache.current;
    if (hit && hit.state === state && hit.selector === selector) return hit.value;
    const value = selector(state);
    cache.current = { state, selector, value };
    return value;
  };
  return useSyncExternalStore(
    store.subscribe,
    () => pick(store.getSnapshot()),
    () => pick(store.getServerSnapshot()),
  );
}

/** The rows of one collection. The same array until the collection changes. */
export function useCollection<S extends SchemaOf<S>, K extends keyof S & string>(store: Store<S>, name: K): readonly S[K][] {
  return useSyncExternalStore(
    store.subscribe,
    () => store.list(name),
    () => (store.getServerSnapshot()[name] ?? EMPTY) as readonly S[K][],
  );
}

export interface UseAuth {
  /** "loading" on the server and in the first client render, then "signed-in" or "signed-out". */
  status: "loading" | "signed-out" | "signed-in";
  user: PublicUser | null;
  signIn: (email: string, password: string) => SignInResult;
  signOut: () => void;
  /** "admin" implies "member". */
  hasRole: (role: Role) => boolean;
}

/** The signed-in user and the sign-in and sign-out actions. Defaults to the current demo app's auth. */
export function useAuth(auth?: Auth): UseAuth {
  const source = auth ?? getDemoApp().auth;
  const state = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getServerSnapshot);
  return useMemo(
    () => ({
      status: state.status,
      user: state.user,
      signIn: source.signIn,
      signOut: source.signOut,
      hasRole: (role: Role) => roleAllows(state.user, role),
    }),
    [source, state],
  );
}

const noopSubscribe = () => () => {};

/** false on the server and during hydration, true afterwards. Use it to switch to browser-only values (time zone, platform, storage). */
export function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const subscribeClock = (listener: () => void) => {
  const timer = setInterval(listener, 15_000);
  return () => clearInterval(timer);
};
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000;

/** The current time to the minute, for labels like "Today" and "5 min ago". SEED_EPOCH on the server and in the hydration render. */
export function useNow(): number {
  return useSyncExternalStore(subscribeClock, currentMinute, () => SEED_EPOCH);
}

export interface HotkeyOptions {
  /** false switches the shortcut off (default true). */
  enabled?: boolean;
  /** Fire while a text field has focus, even without `mod` (default false). */
  allowInInputs?: boolean;
  /** Call preventDefault on a match (default true). */
  preventDefault?: boolean;
}

/**
 * A global keyboard shortcut for as long as the component is mounted: "mod+k", "mod+shift+p", "escape", "[", "?".
 * `mod` is Command on Apple platforms and Control elsewhere. Without `mod` it ignores key presses made inside text fields, during IME
 * composition and ones another handler already took (event.defaultPrevented, such as Escape closing a dialog).
 */
export function useHotkey(combo: string, handler: (event: KeyboardEvent) => void, options: HotkeyOptions = {}): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  const { enabled = true, allowInInputs = false, preventDefault = true } = options;
  useEffect(() => {
    if (!enabled) return;
    const spec = parseCombo(combo);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (!matchesCombo(spec, event, isApplePlatform())) return;
      if (!spec.mod && !spec.ctrl && !spec.meta && !allowInInputs && isEditableTarget(event.target)) return;
      if (preventDefault) event.preventDefault();
      latest.current(event);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [combo, enabled, allowInInputs, preventDefault]);
}

/**
 * One URL query parameter as state: `const [channel, setChannel] = useQueryParam("c", "general")`.
 * Setting the fallback value (or "") removes the parameter. Other parameters are kept; history is replaced, not pushed.
 */
export function useQueryParam(key: string, fallback = ""): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) || fallback;
  const set = useCallback(
    (next: string) => {
      setParams(
        (previous) => {
          const out = new URLSearchParams(previous);
          if (next === "" || next === fallback) out.delete(key);
          else out.set(key, next);
          return out;
        },
        { replace: true },
      );
    },
    [key, fallback, setParams],
  );
  return [value, set];
}
