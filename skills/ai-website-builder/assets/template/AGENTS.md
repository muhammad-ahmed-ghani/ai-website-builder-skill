# AGENTS.md (atelier-vite)

> Not running on a hosting platform? Read `STANDALONE.md` first: it lists what a platform did for you (tokens, images, form endpoint, AI gateway, immersive media, demo accounts) and what to do by hand. Where this file says "the platform", that is what it means.

App and app starter: Vite + React 19 + TypeScript strict + Tailwind v4 + react-router. `pnpm build` prerenders real HTML per route.
Read sections 3 and 8-12 before writing UI (and 14 when the brief is an application). Look up the rest when needed.
Contents: 1 Commands, 2 File map, 3 Tokens, 4 Pages and sections, 5 Images, 6 AI features, 7 Do not touch, 8 Accessibility, 9 SEO, 10 Copy honesty, 11 Done, 12 Budgets and motion, 13 Immersive kit, 14 Apps.

## 1. Commands
- `pnpm dev` dev server (PORT env). `pnpm build` = typecheck + client build + prerender; it must pass. `pnpm lint` token, accessibility, SEO, motion, copy and honesty lint; errors fail it, warnings print and each needs a decision.
- Silence ONE finding with a comment `lint-ok: <rule-id> <reason>` on the line or the line above (a waiver with no reason is itself a warning). Copy rules read `scripts/copy-tells.json` (words, phrases and patterns that mark generated prose; do not edit it per project). The rendered-page checks (contrast, hierarchy, covered text, keyboard focus) run in the skill's `scripts/check-app.mjs`, not here.
- Add packages with `pnpm add` (a font package, a small library only when the brief needs it). Keep the dependency list short.

## 2. File map
- `src/pages/*.tsx` one component per route. `src/sections/<page>/*.tsx` sections of a page (create as needed). `src/routes.tsx` route table.
- `src/components/core/` layout primitives: Container, Section, Heading, Eyebrow, Prose, Reveal, Img, Link, Seo, NavBar, Footer, SkipLink, Layout, Form, Cta, Draft. `src/components/motion/` Stagger, CountUp, Ticker (section 12). `src/components/immersive/` the immersive kit (section 13).
- `src/components/ui/` 18 primitives: button input textarea label checkbox switch select dialog sheet popover tooltip accordion tabs badge card separator skeleton toast. Import `@/components/ui/<name>`.
- `src/components/ai/` useAiJob + GenerationProgress. `src/lib/ai.ts` AI client. `src/lib/utils.ts` `cn()`. `src/components/app/` + `src/lib/app/` the app kit (section 14); `src/app/` an app's demo accounts, wiring and seed.
- `src/app.config.ts` brand name, tagline, nav, footer links. `src/index.css` base styles. `src/styles/` tokens.css, fonts.css. `public/` static files.

## 3. Tokens: colours, fonts, radii, shadows come ONLY from tokens
- Colour: `bg-bg bg-surface bg-surface-2 text-fg text-muted border-line bg-accent text-accent-fg bg-accent-soft bg-secondary text-secondary-fg bg-secondary-soft text-success text-warning text-danger`; focus ring is `--color-focus`.
- Font: `font-display font-sans font-mono`. Size: `text-xs sm base lg xl 2xl 3xl 4xl 5xl hero`. Radius: `rounded-sm md lg xl full`. Shadow: `shadow-sm md lg`.
- Rhythm: `py-section` between sections. Motion: `ease-out ease-in-out ease-spring`, `duration-(--duration-fast|base|slow)`.
- Forbidden: palette classes (`bg-zinc-500`, `text-red-600`, `bg-white`, `text-black`), hex/rgb/hsl/oklch in code, arbitrary values for colour, radius or font (`bg-[#fff]`, `rounded-[6px]`), `font-family`, Google Fonts, `next/font`.
- Those classes generate no CSS here (the default palette is removed), so the page would silently look wrong. `pnpm lint` also flags them.
- Dark mode is `[data-theme="dark"]` inside tokens.css when the direction has one. Never write `dark:` colour classes.
- To change the look, change the values in `src/styles/tokens.css` and the font imports in `src/styles/fonts.css` (this standalone copy has no generator: you author them, then run the skill's `scripts/contrast.mjs`). Components never carry look decisions.

## 4. Adding pages and sections
1. Create `src/pages/Pricing.tsx` exporting `Pricing` with exactly one `<Seo title description />` and one `<Heading level={1}>`.
2. Register it in `src/routes.tsx`: `{ path: "/pricing", Component: Pricing }`. A param route (`/blog/:slug`) needs `paths: ["/blog/a"]` to be prerendered.
3. Add the link to `nav` in `src/app.config.ts`. Unknown URLs render `src/pages/NotFound.tsx` (also `dist/404.html`).
4. Compose pages from `Section` (tone: default | surface | inverse; it includes the Container), `Heading`, `Eyebrow`, `Prose`, `Reveal`.
5. Render must be identical on server and client: no `window`, `localStorage`, `Date.now()`, `Math.random()` while rendering. Use `useEffect` or handlers.
6. No `React.lazy` for routes. Interactive widgets that need the browser go behind a `useEffect` mount flag.
7. Function components with named exports, `import type` for types, `@/` imports from `src/`, classes merged with `cn()`.
8. Internal links are `<Link to="/about">` (from `@/components/core`), never `<a href="/about">`: apps are served from a sub-path only the router knows.

## 5. Images
- The platform generates, optimises and registers images: spread the manifest entry, `<Img {...assets["hero"]} sizes="(min-width: 1024px) 50vw, 100vw" priority />`. It carries avif/webp widths, the real width and height and a blur preview. Never a bare `<img>`.
- Files in `public/assets/` are webp, avif or svg. Budgets: hero under 300 KB, any other image under 150 KB (`pnpm lint` and the perf gate enforce `scripts/budgets.json`). Never commit a large original.
- `priority` on the single LCP image per page only; everything else lazy-loads. Say how wide it is drawn with `sizes`, or phones download the desktop file. `alt` describes the image; `alt=""` only for pure decoration. No hotlinked or stock URLs.
- Do not hand-draw illustrative SVG (bowls, plates, bottles, hands, people, scenes) as a stand-in for a photograph: use the generated image, type, or a layout that needs none. SVG icons and decorative geometry (rules, shapes, patterns) are fine.
- A generated picture is not a record of a real event: never caption it with a date, time, place or person, and never present it as evidence.

## 6. AI features (platform rail)
- Use `src/lib/ai.ts`: `isAiConfigured()`, `generateImage(endpoint, { prompt })`, `runModel`, `subscribe`, and `useAiJob` + `<GenerationProgress>` for UI. Never call `fal` from `@fal-ai/client` unconfigured (`configureFalSingleton()` first).
- The browser talks to the platform rail, never to Fal; never add FAL_KEY or any provider key (`VITE_AI_APP_KEY` is a scope-limited key meant for the bundle). Only endpoints in the capability manifest work (`endpoint_not_allowed`): show `AiError.userMessage`, hide AI UI when `!isAiConfigured()`.

## 7. Do not touch
- `src/styles/theme-reset.css`, `src/lib/immersive.ts`, `src/app/accounts.ts`, `src/app/db.ts`, `src/components/app/`, `src/lib/app/`, `public/assets/immersive/`, `scripts/`, `vite.config.ts`, `index.html` head tags, `package.json` dependencies, `.env*`.

## 8. Accessibility floor
- One `<h1>` per page, no skipped levels. Keyboard reachable and visibly focused (the global `:focus-visible` ring); never `outline-none` without a replacement.
- Every input has a `<Label>`. Icon-only buttons have `aria-label`. Contrast comes from token pairs: use `text-fg` or `text-muted` on `bg-bg`/`bg-surface`, `text-accent-fg` on `bg-accent`.
- Motion is off under `prefers-reduced-motion` (handled globally and in `Reveal`). Do not remove that block. Dialogs and sheets keep their Title and Description.

## 9. SEO floor
- Every route renders one `<Seo>` with a unique title and a 70-160 character description. `pnpm build` fails otherwise. Add `jsonLd` only for facts that are true.
- The one `<h1>` says what the page is (the name or the category), in words: not a phone number, price or slogan. A call or book action is a separate link.
- The platform sets `appConfig.ogImage` (a 1200x630 card made from the tokens), `theme-color` and `color-scheme` in index.html. Do not set them by hand. The build writes sitemap.xml and robots.txt from `src/routes.tsx`.

## 10. Copy honesty
- Never invent testimonials, customer logos, press mentions, ratings, awards, statistics, team members, prices or addresses. Use what the brief gives you.
- If a fact is missing, OMIT it: that is the default, and a page that reads well without the line is finished. Prices, hours, reply times, shipping, policies, guarantees, qualifications and service lists are facts too: only what the brief confirms.
- A placeholder is the exception, not the design: `<Draft id="opening-hours" label="Opening hours">Opening hours to be confirmed</Draft>` (from `@/components/core`) renders as a small marker (dotted underline, a tiny asterisk) the owner must confirm, and publishing is refused while any remain. Never `[Replace ...]` boxes, never a bordered or tinted chip.
- At most ONE Draft may be visible in a page's first screen (normally the primary action's destination, which `<Cta>` renders itself). Never put Drafts in the rows, fields or cards of a hero element: a table row, a card or a stat block whose value is unknown is left out of the table, not filled with "to be confirmed".
- Every other missing fact goes in ONE calm area lower on the page, such as a small `<Section tone="surface">` titled "Details we are still confirming" with a plain list, or is omitted. Two or three Drafts there are fine; a page that is mostly Drafts is a sign the section should not exist yet.
- Forms are `<Form name fields submitLabel messages />`: it posts to the platform relay (`src/lib/form.ts`) with sending, success, error and offline states in your own words. Never formsubmit, formspree, getform, web3forms or `action="#"`.
- Primary actions are `<Cta href fallback={{ email, phone, subject }}>`: the client's link, else their email or phone, else a visible Draft. Never a disabled button or `href="#"`. Only contact details the brief gives.
- The client's own logo and photos are in `assets["supplied-..."]` (see the build message). Use them; never hotlink their URLs or draw a substitute.

## 11. Definition of done
- `pnpm lint` and `pnpm build` pass with no warnings you caused. Each route has one `<Seo>`, one `<h1>`, real copy, no "Replace me".
- Mobile (375px), tablet and desktop layouts hold without horizontal scroll. Check `dist/<route>/index.html` has the page content and title.
- Report honestly: what was built, what is placeholder, what you did not verify.

## 12. Budgets and motion
- Measured on the production build and printed in the verify report. Per route: JS gzip target 100 KB (max 170), CSS 20 KB (40), images 500 KB (1.2 MB), LCP image 200 KB (300), at most 4 font faces and 3 weights (6, 4); LCP 2.5 s, CLS 0.1, TBT 200 ms. Add no library for a small effect (no animation, chart or 3D package unless the brief needs it).
- Motion recipes live in `src/components/motion` and `src/index.css`: tokens only, off under reduced motion, block-axis only (RTL safe). `reveal` `<Reveal variant="rise|fade|clip">`, `stagger` `<Stagger>` on the list, `count-up` `<CountUp to>` (a real figure only), `ticker` `<Ticker items>` (never a marquee), `lift` `className="lift"`, `view-transition` (built into `<Link>`).
- The concept's signature moment is built with exactly one recipe on its element: `data-signature="<recipe id>"`. The `signature-present` gate fails when the built page has none or it does not move. A still concept needs none.
- Use logical properties (`ps-*`, `border-s`, `start-*`, `text-start`), never `left`/`right`/`pl`/`ml` for layout.

## 13. Immersive kit (only when the concept's signature move calls for it)
- `src/components/immersive/`: `ScrubFrames` (frame sequence on canvas), `ScrubVideo` (a film scrubbed by scroll), `Runway` + `Beat` + `Chapters` (pinned stage, text beats, chapter links), `LoopVideo`, `ShaderHero`, `CutOut`, `Mascot`, `Preloader`. Most apps use none; one signature scene per page. An app that does not import it pays nothing.
- Media is made by the platform (`immersive_make`), never by hand: it writes `public/assets/immersive/<id>/` and `src/lib/immersive.ts`. Use `<ScrubFrames {...immersive["film"]} screens={6}>` with `<Beat from={0} to={0.4}>` text inside. No `<video>`, `<canvas>` or media paths of your own (lint: `bare-video`, `immersive-src`).
- The poster is in the markup; the h1, text and links are real DOM (beats), never inside media. Reduced motion, Save-Data and slow connections get the poster, phones the small set, nothing hijacks scroll (tall runway of 3 to 8 screens, sticky stage). Put `<Preloader label="the film" />` on a page whose first frame needs over 1.5 s: never a bare spinner.
- Budgets (`scripts/budgets.json` `immersive`, measured by the `immersive` gate): desktop 14 MB max, phone 6 MB, 90 KB a frame, scrub MP4 12 MB, poster 300 KB.
- Components set `data-signature` themselves (scrub-film, scrub-frames, pinned-chapters, shader-hero, cutout-depth, mascot, loop-hero); pass `signature={false}` on a scene that is not the signature. `CutOut` goes in a `relative` section (`edge="end"` crosses into the next).
- Capture contract, do not remove: stage `data-scene="scrub|frames|video|shader|none"`, `data-progress` 0..1, `data-ready`; `data-preloader="loading"` then `done`; `window.__scenes = { scenes, ready, progress(), seek(p) }`.

## 14. Apps (kit for working applications)
- The brief is an app (team chat, dashboard, portal) when `appConfig.kind === "app"`. Then `/` IS the app: no landing page unless asked, and then at `/welcome` with `chrome: "pages"`. Route `chrome` in `src/routes.tsx`: `app` = NavBar + Footer + main, `app` = the page's AppShell owns `<main>`, `bare` = the page or AuthGate owns it. Routes default to `app`.
- No server: the demo backend lives in the browser. `src/app/accounts.ts` (platform-written demo accounts) and `src/app/db.ts` (platform-written `createDemoApp` wiring, exports `store` and `auth`): never edit them, never invent other credentials. `src/app/seed.ts` is yours: typed rows, deterministic ids, timestamps from `ctx.now` (`ctx.now - 5 * 60_000`), 6 to 12 rows per collection that matters, real-feeling names and messages, no lorem. The people in it include the demo accounts' own names.
- Data: `useCollection(store, "messages")` re-renders on change, `store.insert|update|remove` change it (persisted in localStorage, synced across tabs), `sendOptimistic` shows a sending state. `createId("m")`, `Date.now()` and `Math.random()` only inside handlers, never while rendering. Import `@/app/db` in every page that uses the store or auth.
- Login screen: `<AuthGate guest title="Sign in"><SignInForm accounts={demoAccounts} /></AuthGate>`. The credentials MUST be visible without asking (SignInForm shows them and fills them with "Use this account"). Never `<Draft>` for credentials, never "ask your admin". SignInForm renders the page's h1.
- Guards: `<><Seo noindex .../><AuthGate title="Team chat"><AppShell title="..." sidebar={...}>...</AppShell></AuthGate></>`; `role="admin"` for admin screens. Gates and AppShell belong on `app`/`bare` routes (a `app` route already has a `<main>`). `<Seo noindex>` goes OUTSIDE the gate (the prerender only sees what renders on the server). While the session loads, the gate renders its own sr-only h1, so each prerendered route still has exactly one h1; app routes are `noindex`.
- Kit (`@/components/app`): AppShell (resizable sidebar, drawer below md, optional right `panel`, owns `<main>`), SidebarSection + SidebarItem, CommandPalette (mod+K, items = your screens and channels), Composer + MessageList, EmptyState, Avatar, Kbd, AccountMenu, DemoNote. Hooks and helpers: `@/lib/app` (useAuth, useQueryParam, useHotkey, fuzzyFilter, dayLabel, relativeTime). Nothing from either is bundled into an app that does not import it.
- Every screen has empty, loading, error and offline states in plain words, a keyboard path (Tab order, Enter sends, Escape closes, mod+K searches) and focus that is visible. "Demo data, stored in this browser" stays on screen (AppShell shows it).
- Honest copy: sample data in an app is product sample data, allowed because it is labelled demo. Never invent facts about the client's real business, customers, prices or reviews; no fake testimonials ever.
- Forbidden in an app: marketing hero, steps, FAQ, pricing or final CTA at `/`; decorative metaphor illustrations (boats, piers, mountains, mascots standing in for UI); `<Draft>` for credentials. Pictures only for empty states, auth screen art, avatars and spot art, onboarding: generated images, never text inside them. `pnpm lint` fails app-credentials, app-entry, app-marketing, app-draft-credentials and warns app-ungated-route.
- `/?as=admin|member|guest|<email>` signs a demo account in (or out) when the page loads and removes the param. It is for LOOKING at a screen (screenshots); never link to it from the UI.
