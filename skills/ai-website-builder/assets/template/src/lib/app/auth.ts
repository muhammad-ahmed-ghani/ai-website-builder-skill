/**
 * Demo auth: sign-in against a list of SEEDED DEMO ACCOUNTS, checked in the browser. There is no server and no real security:
 * the accounts and their passwords are shown on the login screen on purpose (see components/app/DemoCredentials).
 *
 * - `accounts` is a function so it can read the store's `accounts` collection: an admin screen that inserts an account creates a signable account.
 * - The session is `{v:1,userId,at}` under `${key}:session`, validated against the accounts on every read: a session whose account is gone or
 *   switched off is signed out. Signing out (or in) in one tab reaches the others over BroadcastChannel `${key}:auth`.
 * - The server snapshot is always `{status:"loading",user:null}`, so the prerender and the first client render match; the real state follows.
 * - The user object never carries the password.
 */
import { browserStorage, openSync, type ChannelFactory, type StorageLike } from "./storage";

export type Role = "admin" | "member";

export interface Account {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  title?: string;
  disabled?: boolean;
}

export type PublicUser = Omit<Account, "password">;

export interface AuthState {
  status: "loading" | "signed-out" | "signed-in";
  user: PublicUser | null;
}

export type SignInResult =
  | { ok: true; user: PublicUser }
  | { ok: false; code: "empty" | "unknown-email" | "wrong-password" | "disabled"; message: string };

export interface AuthOptions {
  key: string;
  accounts: () => readonly Account[];
  /** undefined = localStorage, null = memory only. */
  storage?: StorageLike | null;
  /** undefined = BroadcastChannel when it exists, null = no cross-tab sync. */
  channel?: ChannelFactory | null;
  now?: () => number;
}

export interface Auth {
  /** Email is trimmed and case-insensitive, the password is exact. Never throws: read `ok`. */
  signIn(email: string, password: string): SignInResult;
  signOut(): void;
  getUser(): PublicUser | null;
  /** "admin" implies "member". */
  hasRole(role: Role): boolean;
  /** Preview helper: sign a demo account in without its password, by role ("admin", "member") or email. For looking at a screen, never for the UI. */
  signInAs(roleOrEmail: string): SignInResult;
  /** Re-check the session against the accounts and tell subscribers if it changed. createDemoApp calls this when the accounts collection changes. */
  refresh(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): AuthState;
  getServerSnapshot(): AuthState;
  close(): void;
}

const SERVER_STATE: AuthState = Object.freeze({ status: "loading", user: null });

export function publicUser(account: Account): PublicUser {
  const { password: _password, ...user } = account;
  return user;
}

/** admin implies member. */
export function roleAllows(user: { role: Role } | null, role: Role): boolean {
  if (!user) return false;
  return user.role === "admin" || user.role === role;
}

/** A same-origin path from a `?next=` value, or null. Rejects absolute URLs, "//host", backslashes and control characters. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  for (let i = 0; i < next.length; i++) if (next.charCodeAt(i) < 0x20) return null;
  return next;
}

function sameUser(a: PublicUser | null, b: PublicUser | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.name === b.name && a.email === b.email && a.role === b.role && a.title === b.title && a.disabled === b.disabled;
}

export function createAuth(opts: AuthOptions): Auth {
  const now = opts.now ?? Date.now;
  const storage: StorageLike | null = opts.storage === undefined ? browserStorage() : opts.storage;
  const sessionKey = `${opts.key}:session`;
  const listeners = new Set<() => void>();

  // The session lives in storage; when storage is missing or fails, it lives in this variable for the life of the page.
  let storageWorks = storage !== null;
  let memory: string | null = null;
  const readRaw = (): string | null => {
    if (storage && storageWorks) {
      try {
        return storage.getItem(sessionKey);
      } catch {
        storageWorks = false;
      }
    }
    return memory;
  };
  const writeRaw = (value: string | null) => {
    if (storage && storageWorks) {
      try {
        if (value === null) storage.removeItem(sessionKey);
        else storage.setItem(sessionKey, value);
        return;
      } catch {
        storageWorks = false;
      }
    }
    memory = value;
  };

  let cache: { raw: string | null; accounts: readonly Account[]; state: AuthState } | null = null;
  let last: AuthState | null = null; // keeps the same object while the state is unchanged
  let notified: AuthState | null = null; // what subscribers were last told

  function derive(raw: string | null, accounts: readonly Account[]): AuthState {
    if (raw !== null) {
      try {
        const session = JSON.parse(raw) as { userId?: unknown };
        const account = typeof session?.userId === "string" ? accounts.find((a) => a.id === session.userId) : undefined;
        if (account && !account.disabled) return { status: "signed-in", user: publicUser(account) };
      } catch {
        /* a corrupt session is no session */
      }
    }
    return { status: "signed-out", user: null };
  }

  /** The current state, validated against the accounts. The same object while nothing changed. */
  function current(): AuthState {
    const raw = readRaw();
    const accounts = opts.accounts();
    if (cache && cache.raw === raw && cache.accounts === accounts) return cache.state;
    const next = derive(raw, accounts);
    const state = last && last.status === next.status && sameUser(last.user, next.user) ? last : next;
    last = state;
    cache = { raw, accounts, state };
    return state;
  }

  function emit() {
    for (const listener of [...listeners]) listener();
  }

  function refresh() {
    cache = null; // re-read storage and accounts
    const after = current();
    if (after !== notified) {
      notified = after;
      emit();
    }
  }

  notified = current();
  const sync = openSync(`${opts.key}:auth`, opts.channel, [sessionKey], refresh);

  function start(account: Account): SignInResult {
    writeRaw(JSON.stringify({ v: 1, userId: account.id, at: now() }));
    refresh();
    sync.post();
    return { ok: true, user: publicUser(account) };
  }

  const fail = (code: Extract<SignInResult, { ok: false }>["code"], message: string): SignInResult => ({ ok: false, code, message });

  const auth: Auth = {
    signIn(emailInput, password) {
      const email = String(emailInput ?? "").trim();
      if (!email || !password) return fail("empty", "Enter an email and a password.");
      const account = opts.accounts().find((a) => a.email.trim().toLowerCase() === email.toLowerCase());
      if (!account) return fail("unknown-email", `No demo account uses ${email}. Use one of the demo accounts shown on this page.`);
      if (account.password !== password) {
        return fail("wrong-password", `That password does not match the demo account for ${email}. The demo password is shown on this page.`);
      }
      if (account.disabled) return fail("disabled", "An admin switched this account off.");
      return start(account);
    },
    signOut() {
      writeRaw(null);
      refresh();
      sync.post();
    },
    getUser: () => current().user,
    hasRole: (role) => roleAllows(current().user, role),
    signInAs(roleOrEmail) {
      const query = String(roleOrEmail ?? "").trim().toLowerCase();
      const accounts = opts.accounts();
      const account =
        query === "admin" || query === "member"
          ? accounts.find((a) => a.role === query && !a.disabled)
          : accounts.find((a) => a.email.trim().toLowerCase() === query);
      if (!account) return fail("unknown-email", `No demo account matches ${roleOrEmail}.`);
      if (account.disabled) return fail("disabled", "An admin switched this account off.");
      return start(account);
    },
    refresh,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    getSnapshot: current,
    getServerSnapshot: () => SERVER_STATE,
    close() {
      sync.close();
      listeners.clear();
    },
  };
  return auth;
}
