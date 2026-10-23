# Using this template without a hosting platform

The template was written for a builder platform that owned a few things. Without one, you do them by hand. Everything else (tokens, kit, prerender, lint, motion, immersive kit, app kit) works as is. Where a comment or `AGENTS.md` says "the platform", it means the things in this table.

| The platform did this | Do this instead |
|---|---|
| Wrote `src/styles/tokens.css` and `fonts.css` from the chosen direction | Author them by hand from `.app-notes/direction/DESIGN.md`; keep the token NAMES; run `node <skill>/scripts/contrast.mjs --tokens src/styles/tokens.css` and fix every failing pair by changing lightness |
| Generated, optimised and registered images (`src/lib/assets.ts`) | Make pictures with your image tool into `.app-notes/originals/`, then `node <skill>/scripts/optimize-images.mjs --src .app-notes/originals --alt .app-notes/alt.json`, which writes `public/assets/*` and the manifest |
| Ran the form relay (`VITE_FORMS_URL`) | Set that variable to an endpoint the OWNER controls (a serverless function, their own backend). Without it `<Form>` shows an honest "not connected" state, so tell the owner. Never a third-party form service they did not choose |
| Ran the AI gateway (`src/lib/ai.ts`, `VITE_AI_URL`, `VITE_AI_APP_KEY`) | If the app has no AI feature, delete `src/lib/ai.ts` and `src/components/ai`. If it has one, put your own thin server between the browser and the provider; never a key in the bundle |
| Made immersive media and wrote `src/lib/immersive.ts` | Make the clip or frames yourself (ffmpeg, an image or video model), put them in `public/assets/immersive/<id>/` and add an entry to `src/lib/immersive.ts` in the shape of `ImmersiveEntries` (`src/components/immersive/types.ts`); or choose `Runway` + `Beat` chapters, which need no media |
| Wrote `src/app/accounts.ts`, `db.ts`, `seed.ts` for working apps | Run the skill's `scripts/scaffold.sh <dir> --app`, or copy them from the skill's `assets/app-starter/` (see references/05-working-apps.md). An app nobody signs in to keeps `demoAccounts` empty |
| Kept state of the run in its own folder | Keep your notes in `.app-notes/` (this template ships `.app-notes/README.md`) |
| Set `kind`, theme-color, og:image, sitemap | Edit `src/app.config.ts` (`kind: "app"` for a working app, `lang`, `dir`, `url` via `VITE_APP_URL`); the build writes `sitemap.xml` and `robots.txt` from `src/routes.tsx`; make a 1200x630 share card yourself and point `appConfig.ogImage` at it |

`pnpm lint` and `pnpm build` are the same everywhere: both must pass. Serve the production build with `pnpm preview` when you check it (the config redirects `/route` to `/route/` the way a static host does, which avoids a false hydration error).

Publishing: `pnpm build` writes `dist/` (real HTML per route, `404.html`, `sitemap.xml`). Any static host works. For a sub-path host set `VITE_BASE=/sub/` and `VITE_APP_URL=https://example.com` before building.
