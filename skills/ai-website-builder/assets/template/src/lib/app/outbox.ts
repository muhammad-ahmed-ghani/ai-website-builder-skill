/**
 * Optimistic sending for a demo app: the row appears at once as "sending", then becomes "sent" (or "failed") after a short delay,
 * the way a real network round trip would feel. Call it from an event handler (a submit), never while rendering.
 */
import type { Row, SchemaOf, Store } from "./store";

export type SendStatus = "sending" | "sent" | "failed";

export interface OutboxOptions {
  /** How long the row stays "sending". Default 350 ms. */
  delayMs?: number;
  /** Return true to make this send fail (to show the Retry state). Default: never. */
  fail?: () => boolean;
}

/**
 * Insert `row` with `status: "sending"`, then patch it to "sent" (or "failed") after `delayMs`.
 * Returns a cancel function: it stops the pending patch (the row stays as it is).
 */
export function sendOptimistic<S extends SchemaOf<S>, K extends keyof S & string>(
  store: Store<S>,
  collection: K,
  row: S[K] & { status?: SendStatus },
  options: OutboxOptions = {},
): () => void {
  store.insert(collection, { ...row, status: "sending" } as S[K]);
  return settle(store, collection, row.id, options);
}

/** Put a failed row back to "sending" and settle it again. Returns a cancel function. */
export function retry<S extends SchemaOf<S>, K extends keyof S & string>(
  store: Store<S>,
  collection: K,
  id: string,
  options: OutboxOptions = {},
): () => void {
  const row = store.get(collection, id) as (Row & { status?: SendStatus }) | undefined;
  if (!row) return () => {};
  store.update(collection, id, { status: "sending" } as unknown as Partial<S[K]>);
  return settle(store, collection, id, options);
}

function settle<S extends SchemaOf<S>, K extends keyof S & string>(store: Store<S>, collection: K, id: string, options: OutboxOptions): () => void {
  const delay = options.delayMs ?? 350;
  const timer = setTimeout(() => {
    const status: SendStatus = options.fail?.() ? "failed" : "sent";
    store.update(collection, id, { status } as unknown as Partial<S[K]>);
  }, delay);
  return () => clearTimeout(timer);
}
