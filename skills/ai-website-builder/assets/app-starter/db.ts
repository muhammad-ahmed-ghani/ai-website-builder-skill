import { createDemoApp } from "@/lib/app";
import { APP_KEY, demoAccounts } from "./accounts";
import { seed } from "./seed";

/**
 * The demo backend of this app, in the browser: a persisted store (localStorage, synced across tabs), the demo accounts and a session.
 * Copy to src/app/db.ts. Import it from every page (`import "@/app/db"`) so the app exists; read data with `useCollection(store, "name")`,
 * change it with `store.insert / update / remove`, read the signed-in person with `useAuth()`.
 */
export const app = createDemoApp({ key: APP_KEY, version: 1, accounts: demoAccounts, seed });
export const { store, auth } = app;
