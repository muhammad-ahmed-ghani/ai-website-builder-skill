/**
 * createDemoApp: the one call that makes a working app with no server. It builds the store (seeded, persisted, synced across tabs), puts the
 * demo accounts into its `accounts` collection, builds the auth over that collection, and registers itself as the current app so the
 * kit's components (AccountMenu, SignInForm, AuthGate) find it with getDemoApp().
 *
 * PREVIEW PARAM: `?as=admin | member | guest | <email>` on any URL signs the matching demo account in (or out, for `guest`) when the page
 * loads, then removes only the `as` param from the address bar. It exists so the platform's screenshots and the builders can look at a
 * signed-in screen. It is for looking at a screen, never link to it from the UI.
 */
import { createAuth, type Account, type Auth } from "./auth";
import { createStore, type Schema, type SchemaOf, type Seed, type SeedContext, type Store } from "./store";
import type { ChannelFactory, StorageLike } from "./storage";

export interface PreviewEnv {
  location: Pick<Location, "pathname" | "search" | "hash">;
  history: Pick<History, "state" | "replaceState">;
}

export interface DemoAppOptions<S extends SchemaOf<S>> {
  /** For example "demo-chat". Namespaces the storage keys. */
  key: string;
  /** Bump when the shape of the seed changes in a way old stored data cannot follow. */
  version: number;
  /** The demo accounts (src/app/accounts.ts). They are seeded into the `accounts` collection. */
  accounts: Account[];
  seed: (ctx: SeedContext) => Seed<S>;
  /** Tests: undefined = localStorage, null = memory. */
  storage?: StorageLike | null;
  /** Tests: undefined = BroadcastChannel, null = no sync, or a factory for a fake bus. */
  channel?: ChannelFactory | null;
  /** Tests: where to read and clean the `?as=` param. undefined = the browser's own, null = ignore the param. */
  preview?: PreviewEnv | null;
}

export interface DemoApp<S extends SchemaOf<S>> {
  key: string;
  store: Store<S>;
  auth: Auth;
  /** The demo accounts as given, for showing them on the login screen. */
  accounts: readonly Account[];
  /** Put every collection back to the seed. The session stays. */
  reset(): void;
}

type AnyDemoApp = DemoApp<Schema & { accounts: Account }>;

let current: AnyDemoApp | null = null;

/** The app made by the last createDemoApp call. Throws a clear error when there is none. */
export function getDemoApp(): AnyDemoApp {
  if (!current) throw new Error("createDemoApp was not called: import '@/app/db' in the page");
  return current;
}

/** Apply `?as=` from the address bar once. Returns the value that was applied, or null when there was none. */
export function applyPreviewParam(auth: Auth, env?: PreviewEnv | null): string | null {
  const target: PreviewEnv | null = env === undefined ? (typeof window === "undefined" ? null : { location: window.location, history: window.history }) : env;
  if (!target) return null;
  const params = new URLSearchParams(target.location.search);
  const raw = params.get("as");
  if (raw === null) return null;
  params.delete("as");
  const value = raw.trim();
  if (value.toLowerCase() === "guest") auth.signOut();
  else if (value) auth.signInAs(value);
  const search = params.toString();
  try {
    target.history.replaceState(target.history.state, "", `${target.location.pathname}${search ? `?${search}` : ""}${target.location.hash}`);
  } catch {
    /* the address bar stays as it is */
  }
  return value;
}

export function createDemoApp<S extends SchemaOf<S>>(options: DemoAppOptions<S>): DemoApp<S & { accounts: Account }> {
  type Full = S & { accounts: Account };
  const accounts = options.accounts.map((account) => ({ ...account }));
  const store = createStore<Full>({
    key: options.key,
    version: options.version,
    seed: (ctx) => ({ ...(options.seed(ctx) as object), accounts: accounts.map((a) => ({ ...a })) }) as Seed<Full>,
    storage: options.storage,
    channel: options.channel,
  });
  const auth = createAuth({
    key: options.key,
    accounts: () => store.list("accounts") as readonly Account[],
    storage: options.storage,
    channel: options.channel,
  });
  store.subscribe(() => auth.refresh());

  const app: DemoApp<Full> = {
    key: options.key,
    store,
    auth,
    accounts: options.accounts,
    reset: () => store.reset(),
  };

  if (current && current.key === options.key) {
    current.store.close(); // a module re-evaluated by hot reload: stop the old instance's channels
    current.auth.close();
  }
  current = app as unknown as AnyDemoApp;
  if (options.preview !== null) applyPreviewParam(auth, options.preview);
  return app;
}
