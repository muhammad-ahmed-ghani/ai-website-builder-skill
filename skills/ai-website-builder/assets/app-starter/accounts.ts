import type { Account } from "@/lib/app";

/**
 * The demo accounts of this app (copy to src/app/accounts.ts and rename the slug).
 *
 * Rules: an admin and a member, each with an email and a password that really sign in (the kit checks them in the browser, against the demo
 * data). They are shown on the sign-in screen (<SignInForm accounts={demoAccounts} />) so nobody has to ask for them. Never invent other
 * credentials, never use a placeholder for a credential, never accept any password.
 *
 * A product nobody signs in to (a learning app, a public tool): keep this file and db.ts, but make the list empty
 * (`export const demoAccounts: Account[] = [];`). Then build NO sign-in screen, use NO `AuthGate`, and pass `account={false}` to `AppShell`.
 * Every screen is open, and progress or data is kept in the browser through `store`. See OpenProductPage.example.tsx.
 */
export const APP_KEY = "demo-myapp"; // change "myapp" to a slug of the product's name: it namespaces the browser storage
export const APP_NAME = "My app";
export const demoAccounts: Account[] = [
  { id: "u-admin", name: "Maya Okafor", email: "admin@myapp.example", password: "demo-admin-1234", role: "admin", title: "Admin" },
  { id: "u-member", name: "Leo Tanaka", email: "member@myapp.example", password: "demo-member-1234", role: "member", title: "Member" },
];
