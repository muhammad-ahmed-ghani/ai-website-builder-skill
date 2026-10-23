---
name: ai-website-builder
description: "Build an app that is designed, honest and verified instead of a template. Use for any request to create, redesign or substantially extend a web app in any stack: a marketing or landing page app, portfolio, local-business app, store front, docs, dashboard, tool, portal, or a learning app such as 'an app for learning a language'. Gives the whole method: reading what the person really wants (an app to read or an app to use), research and content strategy, six-direction inspiration boards chosen from pictures, a binding design baseline, a token-driven build with a starter template, honesty rules (no invented proof, nothing fake working), real-browser QA with evidence, repair, and an honest closing report. Includes a starter template, a contrast checker, a QA capture script and an image optimiser."
argument-hint: "[what to build, in the person's words]"
license: MIT
metadata:
  version: "1.1.0"
  origin: "Distilled from a production AI app builder: its pipeline, rules, lint gates and the failures its real runs taught it"
---

# AI website builder

An app is world class when five things are true at once. It answers what the person actually wanted. It looks like nobody else's and still converts. It says only what is true. Everything in it works. And someone looked at it in a real browser before saying it was done. This skill is the method for getting all five, in any stack, alone or with helper agents.

## Start here: what will people DO in it?

Before any tool call, decide which of these you are building. Read `references/01-read-the-request.md` if it is not obvious.

| The person asks for... | Build | Read |
|---|---|---|
| An app about a business, person, place or thing they sell | A reading app: story, real proof they gave, a way to reach them | 01, 02, 03, 04 |
| Something to USE: a dashboard, tool, portal, "like Slack but...", a redesign of a working tool | A working app: `/` is the working screen, with demo data and, if people sign in, visible demo credentials | 01, 05 first, then 03, 04 |
| An activity (learning a language, exam practice, planning, tracking) with an audience and no business named | A working app. For learning: a designed home with sections, then lessons, practice, progress. NOT a brochure for an invented school | 01, 05 |
| A page that presents an existing product | A reading app about that product | 01, 02, 03, 04 |

The word "website" in a request does not decide it; owner words ("my academy", "our shop") and what people will do in it do. When in doubt, build the working-app reading and say so in your first message.

## The loop (details in `references/00-operating-loop.md`)

1. **Read the request.** Write `.app-notes/brief.json` (facts with the person's own words, unknowns, assumptions) and `.app-notes/requirements.json` (every thing they say, now and later). Ask at most one grouped question, only if a wrong guess would change the build.
2. **Research and strategy** (beside step 3). Study the real category, write the nine strategy answers and the design thesis. `references/02-research-and-strategy.md`
3. **Inspiration boards** (beside step 2). Six boards per round; each board is ONE design shown as four screens of the same app, about 2048 x 1280; the person can ask for more rounds until satisfied. `references/03-design-direction.md`
4. **Concepts, proofs, panel.** One concept per board, structurally different; render each as a real page; score them; choose.
5. **Bind the direction.** `DESIGN.md`, `tokens.css`, `fonts.css`, contrast check, a blueprint per page.
6. **Plan.** Pages and sections with one-line jobs, features with executable acceptance steps, images with jobs.
7. **Build.** Foundation first, then page builders in parallel, then an integrator. Tokens only, real copy, real images, working controls. `references/04-build-system.md`, and `05-working-apps.md` for working apps.
8. **Verify** with `scripts/check-app.mjs` on the production build: three sizes, scroll the way a visitor scrolls, pictures, measured facts, feature flows, a recorded tour. `references/06-qa-and-repair.md`
9. **Repair** at the cause; re-check; roll back what made it worse.
10. **Polish against the chosen picture,** then **report honestly** from measurements only.

Do not skip 3, 4 and 8: they are where an app stops being a template and where "done" stops being a claim. Run independent steps together.

## Non-negotiables

1. **Honesty outranks everything.** Never invent testimonials, logos, press, ratings, statistics, awards, team members, addresses, emails, phone numbers, prices, hours, reply times, policies, guarantees or qualifications. A missing fact is left out (the default), turned into an invitation, or marked once with a visible `<Draft>` for the owner. Counting what the person did not list is inventing. Sample data in a working app is allowed only because the app says "Demo data" on screen.
2. **Nothing pretends to work.** No `href="#"`, no form that goes nowhere, no disabled "not connected yet" button, no third-party form service the person did not choose, no login that accepts anything. Wire it for real or leave it out and say so.
3. **Never claim what was not measured.** Not "tested", "verified", "accessible", "polished" or "responsive" without evidence for that exact claim. "Could not look" is never "clean". Never say work has started unless you made the call that starts it.
4. **Decide the look from pictures, before code,** and build to the chosen picture. No stock looks. Refuse the first- and second-order AI tells unless this client's world earns them.
5. **One design system.** Colour, type, radius, shadow and easing come only from tokens. Two type families at most. One signature moment and one deliberate imperfection. Accent used scarcely.
6. **Pictures are generous, art-directed and never faked.** About one per screen of scrolling, one shared style, through the image manifest, real alt text; no hand-drawn SVG pictures of objects or people; no lettering inside images; no AI image captioned as a real event.
7. **Right language, right script.** `lang` and `dir` set; real script (never transliteration standing in for it); logical CSS properties; translations you cannot verify are flagged for the owner.
8. **Everything the person says is recorded and used.** Follow-ups, steers and answers go into the requirements ledger and are read by every later step. A follow-up continues the same project.
9. **Evidence beats code.** Every visual claim comes from a picture you looked at in this run, at 390, 768 and 1440.
10. **Fix causes, smallest change.** Reproduce, fix the cause, re-check. Two failed patches: rewrite the component. A flaw inside a generated picture needs a new picture, not CSS.

## The starter and the scripts

`<skill>` below is the folder this SKILL.md is in (for example `~/.claude/skills/ai-website-builder`). Run the scripts from the project folder.

```
bash <skill>/scripts/scaffold.sh ./my-app [--app]           # copy the starter, install, lint, build (--app adds src/app/ for a working app)
node <skill>/scripts/contrast.mjs --tokens src/styles/tokens.css   # every colour pair a component uses, light and dark
node <skill>/scripts/optimize-images.mjs --src .app-notes/originals --alt .app-notes/alt.json   # avif + webp set and the manifest
pnpm build && pnpm preview                                  # serve the PRODUCTION build (leave it running)
node <skill>/scripts/check-app.mjs --url http://localhost:4173 --flows .app-notes/flows.json --tour
                                                            # pictures, measured facts, feature flows, recorded visit, report
```

The QA script needs Playwright (`pnpm add -D playwright && npx playwright install chromium`) or `--chrome /path/to/chrome`. The optimiser needs `sharp`.

`assets/template/` is Vite + React 19 + TypeScript + Tailwind v4 with per-route prerender, a token contract, 18 UI primitives, a motion kit, an immersive kit, an app kit and a lint that fails the build on the usual mistakes. Its `AGENTS.md` is the authoritative file map; `STANDALONE.md` says what to do by hand without a hosting platform (author tokens, make images, set the form endpoint). For a working app use `scaffold.sh --app` (it writes `src/app/{accounts,db,seed}.ts`; an app nobody signs in to keeps `demoAccounts` empty). Use another stack if the person's project already has one: the method, the rules and the scripts do not depend on the template.

## Using helpers

With a sub-agent tool, split by `references/08-role-briefs.md` and give each helper a disjoint write scope (foundation: shared files; page builders: one page folder each; integrator last). Alone, follow the same order. Keep one shared to-do list: the person's items are theirs to change; do not hand back while one that fits your part is open; at the end every item is done, blocked with a note, or not done with a reason.

## The closing report (from measurements only)

What you built (pages, features); for a working app, what is real and what is mocked; what the person must supply; what was verified (verdict) and what was NOT; what is still open in plain words; per requirement: built and verified, built not verified, or not done and why. Short, plain, no marketing tone. Use `assets/checklists/done.md` before you send it.

## Reference map

| File | Read it when |
|---|---|
| `references/00-operating-loop.md` | planning the run, splitting work, keeping the ledgers and the to-do list |
| `references/01-read-the-request.md` | the first ten minutes of every job; reading app or working app; language; claims; follow-ups |
| `references/02-research-and-strategy.md` | researching the category, writing the strategy and the design thesis, choosing page skeletons |
| `references/03-design-direction.md` | boards, concepts, moves, typography, craft laws, AI tells, proofs, panel, fidelity |
| `references/04-build-system.md` | writing code: tokens, pages, copy, forms, images, motion, SEO, accessibility, budgets |
| `references/05-working-apps.md` | anything people use: demo backend, sign-in, regions, flows, learning apps |
| `references/06-qa-and-repair.md` | verifying, judging, repairing, critique, the closing report |
| `references/07-failure-catalogue.md` | before you start and before you report: what went wrong before and the cure |
| `references/08-role-briefs.md` | briefing helper agents; mapping tool names |
| `assets/checklists/brief.md`, `done.md` | the shapes of the ledgers; the last check |
