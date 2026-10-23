/**
 * Pure, deterministic text helpers for app screens: initials, day and time labels, relative time, fuzzy search.
 * Nothing here reads the clock unless you leave `now` out, so pass `now` from `useNow()` while rendering.
 * Dates are English (en-US) and use the visitor's time zone; pass `utc = true` for the server-identical first render.
 */

/** "Maya Okafor" -> "MO", "Leo" -> "LE", "" -> "?". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = (word: string) => Array.from(word).filter((ch) => /[\p{L}\p{N}]/u.test(ch));
  const first = letters(words[0] as string);
  if (words.length === 1) return first.slice(0, 2).join("").toUpperCase() || "?";
  const last = letters(words[words.length - 1] as string);
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
}

const pad = (n: number) => String(n).padStart(2, "0");

function parts(ts: number, utc: boolean) {
  const d = new Date(ts);
  return utc
    ? { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), wd: d.getUTCDay() }
    : { y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), h: d.getHours(), min: d.getMinutes(), wd: d.getDay() };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "2026-01-05": one key per calendar day, for grouping. */
export function dayKey(ts: number, utc = false): string {
  const p = parts(ts, utc);
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;
}

/** "Today", "Yesterday", or "Mon, Jan 5" (with the year when it is not this year). */
export function dayLabel(ts: number, now: number = Date.now(), utc = false): string {
  const key = dayKey(ts, utc);
  if (key === dayKey(now, utc)) return "Today";
  if (key === dayKey(now - 24 * 3_600_000, utc)) return "Yesterday";
  const p = parts(ts, utc);
  const base = `${WEEKDAYS[p.wd]}, ${MONTHS[p.m]} ${p.d}`;
  return p.y === parts(now, utc).y ? base : `${base}, ${p.y}`;
}

/** "9:05 AM". */
export function timeLabel(ts: number, utc = false): string {
  const p = parts(ts, utc);
  const hour = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${hour}:${pad(p.min)} ${p.h < 12 ? "AM" : "PM"}`;
}

/** "just now", "5 min ago", "2 h ago", "3 d ago", then a date like "Jan 5". */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const diff = now - ts;
  if (diff < 45_000) return diff < -45_000 ? dateOnly(ts) : "just now";
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(diff / 86_400_000);
  if (days < 7) return `${days} d ago`;
  return dateOnly(ts);
}

function dateOnly(ts: number): string {
  const p = parts(ts, false);
  return `${MONTHS[p.m]} ${p.d}`;
}

const isWordStart = (text: string, i: number) => i === 0 || !/[\p{L}\p{N}]/u.test(text[i - 1] ?? "") || (/\p{Ll}/u.test(text[i - 1] ?? "") && /\p{Lu}/u.test(text[i] ?? ""));

/**
 * Subsequence match: every letter of `query` appears in `text` in order. Higher is better; null means no match.
 * Rewards runs of consecutive letters, matches at the start of a word and an early first match. Case-insensitive.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = Array.from(query.trim().toLowerCase().replace(/\s+/g, ""));
  if (q.length === 0) return 0;
  const source = text.slice(0, 160);
  const lower = source.toLowerCase();
  const n = lower.length;
  if (q.length > n) return null;
  // best[j] = best score with the current query letter matched at text index j (null = impossible)
  let previous: Array<number | null> = [];
  for (let i = 0; i < q.length; i++) {
    const row: Array<number | null> = new Array<number | null>(n).fill(null);
    for (let j = 0; j < n; j++) {
      if (lower[j] !== q[i]) continue;
      const gain = 1 + (isWordStart(source, j) ? 6 : 0);
      if (i === 0) {
        row[j] = gain - Math.min(j, 12) * 0.25;
        continue;
      }
      let best: number | null = null;
      for (let k = 0; k < j; k++) {
        const base = previous[k];
        if (base === null || base === undefined) continue;
        const score = base + gain + (k === j - 1 ? 5 : -Math.min(j - k - 1, 8) * 0.5);
        if (best === null || score > best) best = score;
      }
      row[j] = best;
    }
    previous = row;
  }
  let result: number | null = null;
  for (const score of previous) if (score !== null && score !== undefined && (result === null || score > result)) result = score;
  if (result === null) return null;
  const exact = lower === q.join("") ? 10 : lower.startsWith(q.join("")) ? 4 : 0;
  return result + exact - n * 0.02;
}

/**
 * Items that match `query`, best first (ties keep their order). `getText` may return several strings (a label and its keywords):
 * the first counts fully, the others at 70%. An empty query returns `items` unchanged.
 */
export function fuzzyFilter<T>(items: readonly T[], query: string, getText: (item: T) => string | readonly string[]): readonly T[] {
  if (query.trim() === "") return items;
  const scored: Array<{ item: T; score: number; index: number }> = [];
  items.forEach((item, index) => {
    const raw = getText(item);
    const texts = typeof raw === "string" ? [raw] : raw;
    let best: number | null = null;
    texts.forEach((text, i) => {
      const score = fuzzyScore(query, text);
      if (score === null) return;
      const weighted = i === 0 ? score : score * 0.7;
      if (best === null || weighted > best) best = weighted;
    });
    if (best !== null) scored.push({ item, score: best, index });
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map((s) => s.item);
}
