# Build system

The starter is `assets/template/`: Vite 8, React 19, TypeScript strict, Tailwind v4 driven by design tokens, react-router with a per-route prerender (real HTML for every page), 18 token-only UI primitives, layout primitives, a motion kit, an immersive kit, an app kit and a lint that fails the build on the mistakes below. Copy it, then read its `AGENTS.md` (the authoritative file map and rules) and `STANDALONE.md` (what is different outside our platform).

```
bash <skill>/scripts/scaffold.sh ./my-app        # copies the template, installs, checks it builds
cd my-app && pnpm dev                            # PORT env sets the port
pnpm lint && pnpm build                           # both must pass: typecheck, client build, SSR build, prerender
```

## Rules that hold on every page

Look before you write: list and read what exists, reuse `src/components/ui` and `src/components/core`. Write COMPLETE files (never "// rest unchanged"). Edit with exact replacements. Keep one visible plan and tick it as you go.

### Tokens, not taste hacks

Colour, font, size, radius, shadow and easing come ONLY from token utilities: `bg-bg bg-surface bg-surface-2 text-fg text-muted border-line bg-accent text-accent-fg bg-accent-soft bg-secondary text-secondary-fg bg-secondary-soft text-success text-warning text-danger`, `font-display font-sans font-mono`, `text-xs sm base lg xl 2xl 3xl 4xl 5xl hero`, `rounded-sm md lg xl full`, `shadow-sm md lg`, `py-section`, `ease-out ease-in-out ease-spring`, `duration-(--duration-fast|base|slow)`. Forbidden in components: hex, rgb, hsl or oklch literals, Tailwind palette classes (`zinc-500`, `bg-white`, `text-black`), arbitrary values for colour, radius or font (`bg-[#fff]`, `rounded-[6px]`), `font-family`, Google Fonts, `dark:` colour classes (dark mode is `[data-theme="dark"]` inside tokens.css when the direction has one). Palette classes generate no CSS here (the default palette is removed), so the page would silently look wrong; `pnpm lint` flags them.

The token contract: `--color-*` (bg, surface, surface-2, fg, muted, line, accent, accent-fg, accent-soft, secondary, secondary-fg, secondary-soft, success, warning, danger, focus) as `oklch(L C H)`; `--font-display|sans|mono`; `--text-xs...hero` fluid `clamp()` sizes each with a line height; `--radius-sm...full`; `--shadow-sm|md|lg`; `--ease-out|in-out|spring`; `--spacing-section`; `--duration-fast|base|slow` (120, 240, 480 ms). Every pair components use (`fg` on `bg` and `surface`, `muted` on `bg`, `accent-fg` on `accent`) must meet WCAG AA: 4.5:1 body, 3:1 large text. `scripts/contrast.mjs` checks them; fix a failing pair by changing lightness, never by lowering the bar.

### Pages, sections, routes

- One component per page in `src/pages/`, exporting a named component with exactly one `<Seo title description />` and one `<Heading level={1}>`. Sections of a page go in `src/sections/<page>/`.
- Register the route in `src/routes.tsx` (`{ path, Component }`; a parameter route lists `paths` to prerender) and the navigation in `src/app.config.ts`. Unknown URLs render `NotFound` (also `dist/404.html`).
- Compose with `Section` (tone: default, surface, inverse; includes the Container), `Heading`, `Eyebrow` (sparingly, not on every section), `Prose`, `Reveal`.
- Render is identical on server and client: no `window`, `localStorage`, `Date.now()` or `Math.random()` while rendering; use effects and handlers. No `React.lazy` for routes. Widgets that need the browser sit behind a mount flag.
- Function components with named exports, `import type`, `@/` imports, class merging with `cn()`. Internal links are `<Link to>` from `@/components/core`, never `<a href>` (an app may be served from a sub-path only the router knows).
- Use logical properties (`ps-*`, `border-s`, `start-*`, `text-start`), never `left/right/pl/ml` for layout: an app may be right to left.

### App chrome and kit

`src/components/core/`: Container, Section, Heading, Eyebrow, Prose, Reveal, Img, Link, Seo, NavBar, Footer, SkipLink, Layout, Form, Cta, Draft. `src/components/ui/`: button, input, textarea, label, checkbox, switch, select, dialog, sheet, popover, tooltip, accordion, tabs, badge, card, separator, skeleton, toast. Add a library only when the brief needs it (no animation, chart or 3D package for a small effect).

### Copy

Write like a person who knows this business. Lead with the specific outcome for the visitor; concrete nouns, numbers and details from the brief; short sentences; one idea per paragraph. Avoid weightless words (supercharge, seamless, unlock, elevate, revolutionize, next-generation, cutting-edge, game-changer, effortless, empower, streamline, leverage, harness, robust, holistic, "next level", "in today's fast-paced world"), "it's not X, it's Y", rule-of-three taglines ("Fast. Simple. Powerful."), and em-dash habits. Buttons name the result. Headline and subhead do not repeat each other. If a headline could sit on a competitor's app unchanged, rewrite it. Use the language and locale of the brief. The evidence rule and claims ledger in `01-read-the-request.md` apply to every sentence.

### Forms and actions that always work

- `<Form name fields submitLabel messages />` posts to ONE endpoint (`src/lib/form.ts`, `VITE_FORMS_URL`) and has sending, success, error and offline states in the app's own voice. Without a hosting platform, set that variable to an endpoint the owner controls, or use `<Cta>` with a mail or phone fallback and tell the owner the form is not connected. Never formspree, formsubmit, getform, web3forms, Netlify forms or EmailJS unless the client asked for that exact service; never `action="#"`, an empty handler or `mailto:` as a form action.
- Do not promise what happens next ("we reply within two days") unless the client said it. "Thanks, your message was sent."
- Every primary action goes somewhere real: `<Cta href fallback={{ email, phone, subject }}>`: the client's booking link, else a mail link with a prefilled subject, else a tel link, using only destinations the client gave. With no destination at all, `<Cta>` renders a visible `<Draft>`, or use a small waitlist `<Form>`. Never a disabled button, `href="#"`, or "link not connected yet" on a button. Never an invented email address or phone number.

### Images

- Plan generously and immersively. A page of text blocks with one hero image is the under-built version. Aim for about one art-directed picture per screen of scrolling, up to two dozen when the design wants it: full-bleed backdrops, layered cut-outs, textures, material macros, spot illustrations, process or detail shots, empty states, onboarding and sign-in art, avatars, product shots, dividers.
- Give every picture a JOB (hero photograph, backdrop, editorial illustration, texture, product shot, scene, abstract field), what it shows, the aspect ratio and crop for where it sits (a 21:9 band, a 4:5 portrait), where it goes, and a priority (1 = the first screens need it).
- Art-direct the set as ONE shoot: one shared style sentence (camera and lens or medium, a named light direction, the direction's palette hex values, grain, one deliberate flaw) appended to every prompt. Vary subject, scale and crop for rhythm: wide, tight, detail, space for type.
- Text belongs in HTML. Prompts that ask for lettering inside a picture are stripped.
- People and hands are allowed when the brief calls for them: describe them concretely (age range, posture, clothing, light, action) so they read as specific, not stock. When a believable picture of people is impossible, use a still life, an object, a place or a typographic treatment.
- Never draw a picture yourself: no hand-made SVG or CSS bowls, plates, bottles, hands, people or scenes standing in for a photograph. SVG icons and decorative geometry (rules, shapes, patterns) are fine. If a planned picture is missing, say so; do not fake it.
- Every image goes through the manifest: `<Img {...assets["hero"]} sizes="(min-width: 1024px) 50vw, 100vw" priority />`. The manifest entry carries avif and webp widths, the real width and height and a blur preview. `priority` on the one LCP image only; give `sizes` the width the picture is really drawn at. Never a bare `<img>`, a hotlinked or stock URL, or a large original. Budgets: hero under 300 KB, any other under 150 KB. `scripts/optimize-images.mjs` converts originals and writes the manifest.
- A generated picture is not a record of a real event: no caption with a date, time, place or person. The client's own photos and logo are used as supplied (`assets["supplied-logo-1"]`); you look at each photo and write its alt text yourself.

### Motion

Motion explains and rewards; it does not decorate. Six recipes ship in `src/components/motion` and `src/index.css`, all token-driven, block-axis only (so right to left needs nothing), off under `prefers-reduced-motion`: `<Reveal variant="rise|fade|clip">` (once; `clip` for a headline), `<Stagger as="ul" step={60}>` on the container, `<CountUp to>` (a real number only), `<Ticker items>` (one true fact at a time, never a sideways marquee), `className="lift"`, and view transitions built into `<Link>`.
- The concept's signature moment uses exactly ONE recipe on the element that carries it, tagged `data-signature="<recipe id>"` (`static` when the signature is a layout or type move). Everything else stays quiet.
- By frequency: constant interactions get none; hover 120 to 160 ms; occasional 200 to 260 ms; rare moments (first load, hero) 400 to 800 ms once. Exits are faster than entrances. Animate transform and opacity only; never `transition: all`; never scale from 0; no bounce or elastic for routine UI; no infinite loops except live state; no auto-playing video with sound; never hide content permanently; content is readable when the animation never runs.

### Immersive scenes (rare, exactly one, only when the concept calls for it)

`src/components/immersive`: `ScrubVideo` (one keyframe-dense 4 to 8 s clip scrubbed by scroll; needs a Preloader), `ScrubFrames` (100 to 150 canvas frames, a smaller phone set), `Runway` + `Beat` + `Chapters` (sticky stage over 3 to 8 screens, 3 to 5 text beats; needs no generated media), `LoopVideo` (a calm 3 to 6 s loop; play forward then backward unless it ends where it began), `ShaderHero` (a quiet field with a fallback picture), `CutOut` (one or two transparent objects crossing a section edge), `Mascot` (only for a brand with a character). Real text, h1 and links stay in the DOM, never inside the media; reduced motion, Save-Data, slow connections and no JavaScript show the poster with the text in normal flow; scroll stays native (a tall runway with a sticky stage); put `<Preloader label="the film" />` when the first reveal needs more than 1.5 s; pass `signature={false}` on any scene that is not the signature; never autoplay with sound. Budgets: desktop 14 MB max, phone 6 MB, 90 KB a frame, scrub MP4 12 MB, poster 300 KB. Make the media with your own tools and register it per `STANDALONE.md`, or choose `pinned-chapters`, which needs none.

### SEO and accessibility floor

- Every route renders one `<Seo>` with a unique title (50 to 60 characters, name + what it is), a description of 110 to 155 characters (the starter's build refuses anything outside 70 to 160, so aim inside 110 to 155), a canonical path and Open Graph. JSON-LD only for facts that are true.
- The one `<h1>` says what the page is, in words (the business name or what it is). A phone number, price or slogan is never the h1; set it large in a separate link beside it.
- Landmarks (header, nav, main, footer), headings in order, a visible skip link, a `lang` attribute, alt text that states the image's job (empty alt only for decoration).
- Every interactive element is a real button or link, reachable by keyboard, with a visible `:focus-visible` (never `outline-none` without a replacement) and a target of at least 44 px on touch. Hover hides nothing essential. A control that changes something announces it (`aria-live`, `aria-expanded`, `aria-current`).
- Forms: a visible `<Label>` per input (a placeholder is not a label), inline validation that names the field and the fix, a submit state, and a result the visitor sees. Required fields marked.
- Body at least 16 px, line length 45 to 75 characters, contrast AA, colour never the only carrier of meaning.

### UX resilience (the failures that look fine in a 1440 screenshot)

Essential text reflows at 320 px, at 200 percent zoom and with large user text; fixed heights on text containers are a bug (use min-height); tabular figures for prices and times; chip rows wrap or collapse to "+n" with an operable control; navigation shows the current page, works by keyboard and on mobile collapses to a menu that traps focus and closes on Escape; every data surface has empty, loading, error and populated states, with a next action in the empty one; rapid repeat interaction leaves the right final state; the page reads with images blocked and JavaScript late; mobile is recomposed so the primary action and the key fact are in the first screen at 390 x 844; sticky bars never cover the content they relate to.

### Performance budgets (measured on the production build)

Per route: JS gzip 100 KB target (170 max), CSS 20 KB (40), images 500 KB (1.2 MB), LCP image 200 KB (300), at most 4 font faces and 3 weights (6, 4); LCP 2.5 s, CLS 0.1, TBT 200 ms. Fonts come from npm packages, never a runtime font request.

### AI features on the app

When the product is itself an AI feature (an image generator, a voice tool), the browser never holds a provider key and never calls the provider directly: put a thin server or edge function in between that holds the key, enforces spend limits and rate limits, and bills the owner. Build the full interaction: input with limits, progress (queued, running, elapsed), the result with download and copy, errors for credits, rate limits and moderation refusals, a session history, honest cost where it matters; debounce submits and disable the button while a job runs. Hide the AI UI when the backend is not configured. Delete `src/lib/ai.ts` and `src/components/ai` when the app has no AI feature.

## Parallel build

1. Foundation first (about 3 minutes): tokens and fonts, `app.config.ts`, `routes.tsx`, NavBar and Footer, shared components, seed data for a product, the image plan. Then a quick look at the empty shell.
2. Page builders run at the same time, one page file and one `src/sections/<page>/` folder each, from the page's blueprint and its own board panel. They never edit shared files.
3. Integrator: reconcile routes, navigation, links, shared components and cross-page consistency (same header and footer behaviour, one title and one h1 each).
4. Look at the page after every batch of sections, not at the end.

## Definition of done (build)

`pnpm lint` and `pnpm build` pass with no warnings you caused. Every route has one `<Seo>`, one `<h1>`, real copy, no "Replace me", no dead control. 375, tablet and desktop hold without sideways scroll. `dist/<route>/index.html` contains the page's content and title. Then verification (`06-qa-and-repair.md`). Never write "tested", "verified", "accessible" or "polished" in the report until the evidence exists.
