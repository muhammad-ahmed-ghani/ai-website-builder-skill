/**
 * Storage and cross-tab channel plumbing for the app kit. No dependencies.
 *
 * `StorageLike` is the part of localStorage the kit uses, so tests (and a blocked browser) can swap in memory.
 * `browserStorage()` is null on the server and when the browser blocks storage; callers then keep working in memory.
 * `ChannelFactory` makes a BroadcastChannel-shaped object, so tests can inject a fake bus.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** window.localStorage, or null on the server or when the browser blocks it (private mode, disabled app data). */
export function browserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/** A Map-backed storage: the fallback when localStorage is unavailable, and the test double. */
export function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/** The part of BroadcastChannel the kit uses. */
export interface ChannelLike {
  postMessage(data: unknown): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  close(): void;
}

export type ChannelFactory = (name: string) => ChannelLike;

/** BroadcastChannel when the browser has it, otherwise null (callers fall back to the `storage` event). */
export const defaultChannelFactory: ChannelFactory | null =
  typeof BroadcastChannel === "function" ? (name) => new BroadcastChannel(name) as unknown as ChannelLike : null;

/**
 * Open a channel and call `onMessage` for messages from OTHER tabs (a BroadcastChannel never delivers to itself).
 * `factory`: undefined = the browser default, null = no cross-tab sync at all.
 * When there is no channel and the page is in a browser, the `storage` event on `storageKeys` is the fallback.
 * Returns `post` (tell the other tabs) and `close`.
 */
export function openSync(
  channelName: string,
  factory: ChannelFactory | null | undefined,
  storageKeys: readonly string[],
  onMessage: () => void,
): { post: () => void; close: () => void } {
  if (factory === null) return { post: () => {}, close: () => {} };
  // On the server (the prerender) only an injected factory opens a channel: Node has a BroadcastChannel that would keep the process alive.
  const make = factory ?? (typeof window === "undefined" ? null : defaultChannelFactory);
  if (make) {
    let channel: ChannelLike | null = null;
    const self = Math.random().toString(36).slice(2, 12); // lets a bus that echoes to the sender be ignored
    try {
      channel = make(channelName);
      channel.onmessage = (event) => {
        const from = typeof event.data === "object" && event.data !== null ? (event.data as { from?: unknown }).from : undefined;
        if (from !== self) onMessage();
      };
    } catch {
      channel = null;
    }
    if (channel) {
      const open = channel;
      return {
        post: () => {
          try {
            open.postMessage({ from: self, t: Date.now() });
          } catch {
            /* a closed or unsupported channel never breaks a write */
          }
        },
        close: () => {
          open.onmessage = null;
          try {
            open.close();
          } catch {
            /* already closed */
          }
        },
      };
    }
  }
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") return { post: () => {}, close: () => {} };
  const listener = (event: StorageEvent) => {
    if (event.key === null || storageKeys.includes(event.key)) onMessage();
  };
  window.addEventListener("storage", listener);
  return { post: () => {}, close: () => window.removeEventListener("storage", listener) };
}
