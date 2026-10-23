import { useSyncExternalStore } from "react";

/**
 * The media gate: what the scenes of a page report while their media loads, and what the Preloader shows. A scene registers when it
 * starts to load, reports bytes or files as they arrive and says when it is ready; the Preloader reads the average and the name of what
 * is still loading. Module-level and client-only (nothing here runs during the server render).
 */
export interface GateEntry {
  id: string;
  /** A real name for what is loading: "reel", "frames", "film". */
  label: string;
  loaded: number;
  total: number;
  ready: boolean;
  /** "41 of 120 frames". */
  detail: string;
}

export interface GateSnapshot {
  /** 0..1, mean of the entries. */
  progress: number;
  /** Name of the first entry still loading, else of the last one. */
  label: string;
  detail: string;
  /** Entries that are not ready yet. */
  pending: number;
  /** Entries that ever registered (a Preloader with no scene to wait for releases itself). */
  registered: number;
}

const entries = new Map<string, GateEntry>();
let everRegistered = 0;
let version = 0;
let cached: GateSnapshot = { progress: 0, label: "", detail: "", pending: 0, registered: 0 };
const listeners = new Set<() => void>();

function emit(): void {
  version++;
  const list = [...entries.values()];
  const loading = list.filter((e) => !e.ready);
  const first = loading[0] ?? list[list.length - 1];
  const progress = list.length ? list.reduce((n, e) => n + (e.ready ? 1 : e.total > 0 ? Math.min(1, e.loaded / e.total) : 0), 0) / list.length : 0;
  cached = { progress, label: first?.label ?? "", detail: first?.detail ?? "", pending: loading.length, registered: everRegistered };
  for (const l of [...listeners]) l();
}

export const gate = {
  register(id: string, label: string, total = 0): void {
    if (!entries.has(id)) everRegistered++;
    entries.set(id, { id, label, loaded: 0, total, ready: false, detail: "" });
    emit();
  },
  update(id: string, patch: Partial<Pick<GateEntry, "loaded" | "total" | "detail">>): void {
    const e = entries.get(id);
    if (!e || e.ready) return;
    Object.assign(e, patch);
    emit();
  },
  /** Ready or settled (a scene that fell back to its poster is settled too: nothing more will load). */
  done(id: string): void {
    const e = entries.get(id);
    if (!e || e.ready) return;
    e.ready = true;
    e.loaded = e.total || 1;
    emit();
  },
  remove(id: string): void {
    if (entries.delete(id)) emit();
  },
  snapshot: (): GateSnapshot => cached,
  /** How many entries have ever registered. A Preloader remembers it at mount, so scenes of an earlier page do not count for it. */
  registeredCount: (): number => everRegistered,
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
  /** Test seam. */
  reset(): void {
    entries.clear();
    everRegistered = 0;
    version = 0;
    emit();
  },
  get version(): number {
    return version;
  },
};

const SERVER_SNAPSHOT: GateSnapshot = { progress: 0, label: "", detail: "", pending: 1, registered: 0 };

/** Re-renders when the gate changes. The server render and the hydrating render both see the same empty snapshot. */
export function useGate(): GateSnapshot {
  return useSyncExternalStore(gate.subscribe, gate.snapshot, () => SERVER_SNAPSHOT);
}
