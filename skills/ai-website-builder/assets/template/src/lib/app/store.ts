/**
 * The demo store: named collections of rows that live in the browser (localStorage), with no server.
 *
 * - Every mutation replaces the state object, so `getSnapshot()` is stable between changes and React's useSyncExternalStore
 *   re-renders exactly when something changed. Rows are plain data: replace them, never edit them in place.
 * - `getServerSnapshot()` is the seed computed ONCE with the fixed epoch SEED_EPOCH. Server render and the first client render both read it, so
 *   the prerendered HTML and hydration match; the persisted data appears one render later.
 * - The seed is written to localStorage once (key `${key}:v${version}:data`). It is written again only when nothing valid is stored, the
 *   version differs, the stored value is corrupt, or the seed itself changed (a fingerprint of the seed at SEED_EPOCH; a seed that is not
 *   deterministic has no fingerprint, so it never wipes data on every load).
 * - Other tabs stay in step through a BroadcastChannel `${key}:sync` (or the `storage` event where there is none). A tab never reacts to its own write.
 *   Every change first adopts what another tab already wrote, then applies on top of it, so two tabs writing at once do not lose each other's rows.
 * - A full or blocked storage never throws: the store keeps working in memory.
 */
import { browserStorage, openSync, type ChannelFactory, type StorageLike } from "./storage";

export interface Row {
  id: string;
}

/** Collection name -> row type. Declare it as a `type` or an `interface`: `type AppSchema = { users: User; messages: Message }`. */
export type Schema = Record<string, Row>;

/** The constraint the generics use: every property of S is a row type. Accepts interfaces as well as type aliases. */
export type SchemaOf<S> = { [K in keyof S]: Row };

export type Seed<S> = { [K in keyof S]?: S[K][] };

export interface SeedContext {
  /** The moment the seed is made: timestamps are `ctx.now - n * 60_000`, never `Date.now()`. */
  now: number;
}

export type StoreState<S> = { readonly [K in keyof S]?: readonly S[K][] };

export interface StoreOptions<S extends SchemaOf<S>> {
  /** App key, for example "demo-chat". Namespaces every storage key and channel. */
  key: string;
  /** Bump to throw away data stored by an older shape of the seed. */
  version: number;
  seed: (ctx: SeedContext) => Seed<S>;
  /** undefined = localStorage, null = memory only. */
  storage?: StorageLike | null;
  /** undefined = BroadcastChannel when it exists, null = no cross-tab sync. A factory is how tests inject a fake bus. */
  channel?: ChannelFactory | null;
  now?: () => number;
}

export interface Store<S extends SchemaOf<S>> {
  readonly key: string;
  list<K extends keyof S & string>(name: K): readonly S[K][];
  get<K extends keyof S & string>(name: K, id: string): S[K] | undefined;
  /** Append a row (an existing id is replaced in place). Returns the row. */
  insert<K extends keyof S & string>(name: K, row: S[K]): S[K];
  /** Merge a patch into a row (its id never changes). Returns the updated row, or undefined when there is no such id. */
  update<K extends keyof S & string>(name: K, id: string, patch: Partial<S[K]>): S[K] | undefined;
  upsert<K extends keyof S & string>(name: K, row: S[K]): S[K];
  remove<K extends keyof S & string>(name: K, id: string): boolean;
  replace<K extends keyof S & string>(name: K, rows: readonly S[K][]): void;
  /** Back to the seed (made with the current time), persisted. */
  reset(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): StoreState<S>;
  /** The seed at SEED_EPOCH: identical on the server and in the first client render. */
  getServerSnapshot(): StoreState<S>;
  /** When the current data was seeded (ms), or null while it is only the server snapshot. */
  readonly seededAt: number | null;
  close(): void;
}

/** The fixed "now" of the server snapshot (5 January 2026, 09:00 UTC). */
export const SEED_EPOCH = Date.UTC(2026, 0, 5, 9, 0, 0);

type Data = Record<string, readonly Row[]>;

const EMPTY: readonly never[] = Object.freeze([]);

/** A short random id. Call it from an action (a click, a submit), never while rendering. */
export function createId(prefix = "id"): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  const rand =
    c && typeof c.randomUUID === "function"
      ? c.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14).padEnd(12, "0");
  return `${prefix}_${rand}`;
}

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function isRow(value: unknown): value is Row {
  return typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string";
}

function isData(value: unknown): value is Data {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((rows) => Array.isArray(rows) && rows.every(isRow));
}

export function createStore<S extends SchemaOf<S>>(opts: StoreOptions<S>): Store<S> {
  const now = opts.now ?? Date.now;
  const explicitStorage = opts.storage !== undefined;
  const storage: StorageLike | null = explicitStorage ? (opts.storage ?? null) : browserStorage();
  // No storage option and no window: this is the prerender. State is the fixed-epoch seed, never Date.now().
  const serverOnly = !explicitStorage && typeof window === "undefined";
  const dataKey = `${opts.key}:v${opts.version}:data`;
  const listeners = new Set<() => void>();

  const makeSeed = (at: number): Data => {
    const seeded = opts.seed({ now: at }) as Record<string, readonly Row[] | undefined>;
    const out: Data = {};
    for (const [name, rows] of Object.entries(seeded)) if (Array.isArray(rows)) out[name] = rows;
    return out;
  };

  let serverState: Data | null = null;
  const getServerState = (): Data => (serverState ??= makeSeed(SEED_EPOCH));

  let fingerprintDone = false;
  let fingerprintValue: string | null = null;
  /** A hash of the seed at the fixed epoch, or null when the seed is not deterministic (then only `version` invalidates stored data). */
  const fingerprint = (): string | null => {
    if (!fingerprintDone) {
      fingerprintDone = true;
      const first = JSON.stringify(getServerState());
      const second = JSON.stringify(makeSeed(SEED_EPOCH));
      fingerprintValue = first === second ? fnv1a(first) : null;
    }
    return fingerprintValue;
  };

  let lastRaw: string | null = null; // the stored text this tab last wrote or read

  function readStored(): { data: Data; seededAt: number; raw: string } | null {
    if (!storage) return null;
    try {
      const raw = storage.getItem(dataKey);
      if (raw === null) return null;
      const parsed = JSON.parse(raw) as { v?: unknown; seededAt?: unknown; h?: unknown; data?: unknown };
      if (typeof parsed !== "object" || parsed === null) return null;
      if (parsed.v !== opts.version || typeof parsed.seededAt !== "number" || !isData(parsed.data)) return null;
      const current = fingerprint();
      if (current !== null && typeof parsed.h === "string" && parsed.h !== current) return null;
      return { data: parsed.data, seededAt: parsed.seededAt, raw };
    } catch {
      return null;
    }
  }

  let state: Data;
  let seededAt: number | null;
  const sync = serverOnly ? { post: () => {}, close: () => {} } : openSync(`${opts.key}:sync`, opts.channel, [dataKey], reload);

  function persist(): boolean {
    if (!storage) return false;
    try {
      const text = JSON.stringify({ v: opts.version, seededAt, h: fingerprint(), data: state });
      storage.setItem(dataKey, text);
      lastRaw = text;
      return true;
    } catch {
      return false; // storage is full or blocked: keep working in memory
    }
  }

  function emit() {
    for (const listener of [...listeners]) listener();
  }

  function commit(next: Data) {
    state = next;
    if (persist()) sync.post();
    emit();
  }

  /** Take over what another tab wrote since this tab last looked. Returns true when the state changed. */
  function adopt(): boolean {
    const stored = readStored();
    if (!stored || stored.raw === lastRaw) return false;
    state = stored.data;
    seededAt = stored.seededAt;
    lastRaw = stored.raw;
    return true;
  }

  function reload() {
    if (adopt()) emit();
  }

  if (serverOnly) {
    state = getServerState();
    seededAt = null;
  } else {
    const stored = readStored();
    if (stored) {
      state = stored.data;
      seededAt = stored.seededAt;
      lastRaw = stored.raw;
    } else {
      const at = now();
      state = makeSeed(at);
      seededAt = at;
      persist();
    }
  }

  const rowsOf = (name: string): readonly Row[] => state[name] ?? EMPTY;

  const store: Store<S> = {
    key: opts.key,
    list: (name) => rowsOf(name) as never,
    get: (name, id) => rowsOf(name).find((row) => row.id === id) as never,
    insert(name, row) {
      adopt();
      const rows = rowsOf(name);
      const at = rows.findIndex((r) => r.id === row.id);
      commit({ ...state, [name]: at === -1 ? [...rows, row] : rows.map((r, i) => (i === at ? row : r)) });
      return row;
    },
    update(name, id, patch) {
      const adopted = adopt();
      const rows = rowsOf(name);
      const at = rows.findIndex((r) => r.id === id);
      if (at === -1) {
        if (adopted) emit();
        return undefined;
      }
      const current = rows[at] as Row & Record<string, unknown>;
      const changes = patch as Record<string, unknown>;
      if (Object.keys(changes).every((k) => k === "id" || Object.is(current[k], changes[k]))) {
        if (adopted) emit();
        return current as never;
      }
      const next = { ...current, ...changes, id: current.id };
      commit({ ...state, [name]: rows.map((r, i) => (i === at ? next : r)) });
      return next as never;
    },
    upsert(name, row) {
      return store.insert(name, row);
    },
    remove(name, id) {
      const adopted = adopt();
      const rows = rowsOf(name);
      if (!rows.some((r) => r.id === id)) {
        if (adopted) emit();
        return false;
      }
      commit({ ...state, [name]: rows.filter((r) => r.id !== id) });
      return true;
    },
    replace(name, rows) {
      adopt();
      commit({ ...state, [name]: [...rows] });
    },
    reset() {
      const at = now();
      seededAt = at;
      commit(makeSeed(at));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    getSnapshot: () => state as StoreState<S>,
    getServerSnapshot: () => getServerState() as StoreState<S>,
    get seededAt() {
      return seededAt;
    },
    close() {
      sync.close();
      listeners.clear();
    },
  };
  return store;
}
