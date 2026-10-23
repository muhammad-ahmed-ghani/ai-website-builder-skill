# Apps and products: build the thing, not a page about it

Use this file when `01-read-the-request.md` says the person wants something to USE: an app, dashboard, portal, workspace, tool, "something like <product>", a redesign of a product, or an activity app such as language learning. These rules replace everything elsewhere about heroes, calls to action, testimonials and SEO copy, except the learning app's home (below).

## 1. What `/` is

- `/` is the working app itself: signed out, it sends the visitor to the sign-in screen; signed in (or when nobody signs in), it shows the working screen with real-looking data. The page map is the working app's screens (sign-in, main screen, settings, an admin screen, a detail screen). Three to six screens is normal; do not pad.
- No landing page unless the person asked for one, and then it is a small separate route (`/welcome`) with the app chrome, never `/`.
- Forbidden in a product (except the learning home): a hero, a "how it works" band, an FAQ, a pricing table, testimonials or logo walls, a final call to action band, a decorative illustration that stands for the product (boats, piers, mountains, a waving mascot). Pictures are for empty states, the sign-in screen, avatars, spot art and onboarding.
- Page access in the plan: `guest` (the sign-in screen), `member` (signed in), `admin` (admins only), `open` (a screen with no sign-in, when nobody signs in), `public` (a landing page, only when asked, at `/welcome`).

## 2. Think in product UI

Regions (sidebar, list, detail, composer, panels, dashboard, table, board, settings, form), states (empty, loading, error, offline, nothing selected), density, keyboard (a shortcut for every frequent action; Escape closes; arrows move; a visible `Kbd` hint), and the person's actual pain solved in the interface itself. The first screen is the working screen, never a welcome message. Every list has an empty state with a next action; every action gives feedback (an optimistic update, a toast, a count that changes); nothing is a dead button; destructive actions confirm. Chrome is small and calm: the work is the focus; muted text for the secondary, the accent only for what needs attention. Selected item and filters live in the URL (`useQueryParam`) so back and links work.

Plan sections as REGIONS in layout order. Write into each region's content: what it shows, its states, its shortcuts and the EXACT sample names it holds (the channels, people, items, numbers). Builders and checks read those names, so write them once and keep them.

Example of solving the pain in the interface: a team chat whose left pane is cluttered by dozens of channels opens with pinned channels and channels with unread messages; the rest are grouped by topic into sections that collapse (their counts and unread dots stay visible); muted channels fade into a quiet "Muted" section; direct messages are a separate section; search-to-jump (Cmd or Ctrl K) switches to any channel by name; a one-key switcher moves between recent ones; nothing scrolls forever. A generic list of channels is the failure.

## 3. The demo backend (works in the browser, no server)

A working app built here has no server. The starter's app kit (`src/lib/app`, `src/components/app`) provides a persisted store (localStorage, synced across tabs), demo accounts and a session. Copy `assets/app-starter/{accounts,db,seed}.ts` into `src/app/`:
- `accounts.ts`: an admin and a member, each with an email and a password that really sign in. Written once, never invented elsewhere.
- `db.ts`: `createDemoApp({ key, version, accounts, seed })`, exporting `store` and `auth`. Import `@/app/db` (side effect) in every page so the app exists.
- `seed.ts`: yours. Typed rows with stable string ids, timestamps relative to `ctx.now`, 8 to 14 rows of whatever the screens show (people, channels, messages, lessons, items, numbers): specific and believable, a mix of short and long, some unread, some old. No lorem, no placeholder rows. The demo accounts' own people are in it (`u-admin`, `u-member`).
- Kit API: `useCollection(store, "channels")`, `useStore`, `useAuth()` (`status`, `user`, `signIn`, `signOut`, `hasRole`), `store.insert / update / upsert / remove / reset`, `sendOptimistic(store, "messages", row)`, `createId("m")`, `useQueryParam("c", "general")`, `useHotkey("mod+k", fn)`, `fuzzyFilter`, `dayLabel`, `timeLabel`, `relativeTime`, `initials`. `createId`, `Date.now` and `Math.random` only inside handlers, never while rendering.
- Components: `AppShell` (resizable sidebar, main, optional right panel, a drawer on phones, an account menu with Sign out, the "Demo data, stored in this browser" note), `SidebarSection` and `SidebarItem` (collapsible, counts, unread), `CommandPalette` (mod+K, fuzzy search), `Composer` (Enter sends, Shift+Enter newline), `MessageList` (day groups, avatars, optimistic send), `EmptyState`, `Kbd`, `Avatar`, `DemoCredentials`, `SignInForm`, `AuthGate` (`role="admin"` for admin screens), `DemoNote`. Reuse them; do not rebuild.
- Route guard: `<><Seo noindex .../><AuthGate title="Team chat"><AppShell title="..." sidebar={...}>...</AppShell></AuthGate></>`. `<Seo noindex>` sits OUTSIDE the gate (the prerender only sees what renders on the server). Exactly one `<h1>` per route. Route `chrome` in `routes.tsx`: `pages` (NavBar, Footer, main), `app` (the page's AppShell owns main), `bare` (the page or AuthGate owns it).
- To look at a signed-in screen in a screenshot, load `/?as=admin` (or `?as=member`, `?as=<email>`): it signs a demo account in when the page loads. Looking only: never link to it from the UI.

## 4. The sign-in screen (credentials visible without anyone asking)

`<AuthGate guest title="Sign in"><SignInForm accounts={demoAccounts} /></AuthGate>`. It shows the demo credentials in the placeholders, the helper text and a labelled box with "Use this account". A wrong password is refused with a clear message. A login that accepts anything, a `<Draft>` for a credential, "ask your admin" and a login with no credentials shown are all defects. If nobody should have to sign in, do not build one: set `needsAccounts` false in the brief, keep `accounts.ts` with an EMPTY `demoAccounts` list (`db.ts` still gives you the persisted store), build no sign-in route, use no `AuthGate`, and pass `account={false}` to `AppShell`. Every screen is `open`. `assets/app-starter/OpenProductPage.example.tsx` shows one such screen; it builds, lints and prerenders.

## 5. Learning apps (and other activity apps)

The request: an app for learning or practising something, an audience, no business named. The app is where the learning happens. It is the one working app with a real HOME.

- `/` is a designed home page with sections, in this order: a hero that says what the person will be able to do and has one clear way in (the first lesson); how it works in three steps; the first lessons as a grid of cards (title, minutes, level, the target phrase in both languages); what is inside (practice, translations, audio, progress) with real specimens of the content, never invented numbers, ratings or quotes; and a closing way in. When the learner has begun, the same page shows what is done and one "continue". Its chrome is the app chrome. It has no pricing, testimonials or invented proof.
- Then the product's screens: a lessons list (the path), a lesson, a practice screen, a progress screen, and settings for language and script.
- A lesson shows the material in the learner's own language beside the target language, tap to reveal, and a button that speaks it with the browser's speech (`speechSynthesis`) where available; never an invented recording. Show the button only when `speechSynthesis.getVoices()` has a voice for that language (`en`, `ur`); when it has none, say "Audio is not available on this device for Urdu" in plain words instead of a button that does nothing. Test with the voices of the browser you are using, and say in the report which languages you could not hear. A practice screen asks a few questions, checks answers on the spot and explains a wrong answer kindly. Progress is kept in the browser; the app says plainly that it is free to start and needs no sign-up (unless the person asked for accounts).
- Seed real, correct lesson content of useful size: at least 6 lessons of 8 or more lines each. Everything in a non-Latin script is real text in that script with the right direction (for Urdu: right to left, a Nastaliq or Naskh web font, no transliteration standing in for it); two languages on one line each get their own direction. Mark content you cannot verify for the owner to review.
- Flows to build and test: open a lesson; reveal a translation; answer a question right and wrong; finish a lesson and see the progress change; reload and still have it.
- No enquiry form, no teacher bios, no pricing table unless asked.

## 6. Features are flows the browser can run

Write each feature's flow into `.app-notes/flows.json` (format in the header of `scripts/check-app.mjs`) and run it with `check-app.mjs --flows .app-notes/flows.json`; a flow that fails is a major issue in the report. Every feature has acceptance steps a script could run: `click`, `fill`, `press`, `wait`, `assert_text`, `assert_visible`, `assert_url`. Each check opens a fresh browser, so every flow starts from the sign-in screen (or the open home). The platform side adds: sign in with the demo admin, a wrong password is refused, sign out, admin screens refuse a member. You add the product's own: switch to another item; create it and see it (send a message, add a card); search-to-jump with the palette; collapse a section; open settings as admin, change a setting and see it. Use the kit's selectors and only text YOUR plan dictates:

- sign in: `input[name="email"]`, `input[name="password"]`, `form[data-signin] button[type="submit"]`; the app is up when `[data-app-shell]` is visible; account menu: `[data-app-account]`, then the button text "Sign out".
- palette: press `Control+k`, then `[data-command-palette]` is visible; fill `[data-command-palette] input`; press `Enter`; press `Escape`.
- composer: fill `textarea[name="message"] >> nth=0`, press `Enter`, assert the text you typed. Sidebar sections: click `[data-sidebar-section] button[aria-expanded="true"] >> nth=0`, then assert `[data-sidebar-section] button[aria-expanded="false"] >> nth=0` is visible.
- A selector that can match several elements ends with `>> nth=0`. Never assert text you did not dictate.

A working app with roles needs a screen only an admin can open (the people and what they may do, or the workspace's settings), so role gating has something to show.

## 7. Imagery for a product

Be generous where a picture belongs: the sign-in screen art, empty states (an empty channel, an empty inbox, nothing selected), onboarding, avatars or spot art for people and groups, quiet backdrops and textures. Art-direct each for where it sits (a square empty-state spot, a tall sign-in panel, a wide strip), in the direction's palette, one shared look. Never text inside an image, never a picture that stands in for the interface.

## 8. Honesty for products

State in the report what is REAL (screens, sign-in against the demo accounts, saved data, search, shortcuts) and what is MOCKED (no server or database, no real email, no live updates between different people, sample data). Never claim a backend exists. "Demo data, stored in this browser" stays on screen.

## 9. Expansion, not restart

"Build the whole app", "make it ready", "create the admin credentials" on a project that only has screens means: keep the project, upgrade the kit, plan the whole product, rebuild what is needed, run full QA. It is not a refusal and not a new app.
