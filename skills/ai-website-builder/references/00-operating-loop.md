# The operating loop

The method in order. Every step leaves an artifact in `.app-notes/` (or in your own notes) so a different agent, or you after a long gap, can pick the project up without asking. Steps marked PARALLEL have no dependency on each other: start them together.

Time and cost, as measured on the system this method comes from: a full app is 25 to 35 minutes of wall clock and about $0.5 to $1 of model spend when the work runs in parallel; the same work done serially is 2 to 3 times longer. Design stages are about 6 minutes in parallel. Do not skimp on the design and QA steps to save minutes: they are where an app stops being a template.

| # | Step | Artifact | Gate to leave the step |
|---|---|---|---|
| 1 | Read the request | `.app-notes/brief.json`, `.app-notes/requirements.json` | You can say, in one sentence each, what the person wants to DO, who it is for, and whether it is an app to read or an app to use |
| 2 | Ask once, only if a guess would be wrong | answers appended to the ledgers | At most one grouped question, every option meaningful, a recommended default; unanswered means the default |
| 3 | Research and strategy (PARALLEL with 4) | `.app-notes/research.md`, strategy in `brief.json` | Category conventions named, audience anxieties named, what is NOT known listed |
| 4 | Inspiration boards (PARALLEL with 3) | `.app-notes/direction/boards/round-N/` | At least six complete directions, each one design shown as four screens |
| 5 | Thesis, concepts, proofs | `.app-notes/direction/concept-*.md`, proof screenshots | Concepts are structurally different; each proof is a real rendered page |
| 6 | Choose and bind the direction | `.app-notes/direction/DESIGN.md`, `src/styles/tokens.css`, `fonts.css` | One chosen board; tokens compile; every colour pair clears WCAG AA |
| 7 | Plan | `.app-notes/plan.md` | Pages and sections each have a one-line job; features have executable acceptance steps; images planned with a job |
| 8 | Build (PARALLEL by page) | the app | `pnpm lint` and `pnpm build` pass; no placeholder, no dead control |
| 9 | Verify | `.app-notes/qa/` | Real browser, three sizes, the design scan read, evidence in hand (see 06) |
| 10 | Critique and repair | commits, `.app-notes/critique.md` | The design judged unanchored first, then against the scan; each named pass (see 09) run scoped, ending in evidence; every open defect fixed at its cause or listed honestly |
| 11 | Polish against the chosen picture | commits | The built home page is held beside the chosen board and the gaps are closed |
| 12 | Report | final message | Only what was measured is claimed; unfinished work is named |

A request in the middle of the run (a steer, a new instruction, an answer) goes into `requirements.json` immediately, with where it is served, and is read by every later step. See `01-read-the-request.md`.

## Roles, if you have helpers

A single agent can run every step. With helpers, give each one a brief from `08-role-briefs.md` and these write scopes so they cannot collide:

- Strategist and researcher: read-only on the app, write `.app-notes/research.md`.
- Art director: writes `.app-notes/direction/` only.
- Foundation builder: tokens, layout chrome, shared components, `app.config.ts`, `routes.tsx`, seed data. Finishes first.
- Page builders: one page file and its `src/sections/<page>/` folder each. They never edit shared files; they ask the foundation builder or the integrator.
- Integrator: after the pages, reconciles routes, navigation, shared components, links and consistency across pages.
- Critic and QA: read-only on code; write reports. Repairers get the findings and the pictures that show them.

Build the shared kit first (about 3 minutes), then let page builders run at the same time. A page builder that needs a shared change asks for it in its report; it does not make it.

## Files the method keeps in `.app-notes/`

`brief.json` (shape in `assets/checklists/brief.md`):
- `name`, `summary` (what it is, in the person's terms), `audience`, `appType` (`pages` for a reading app, `app` for a working app), `language` and `dir`, `pages[]` (route, title, purpose), `app` block when it is a product (kind, product, painPoint, needsAccounts, roles, entities, wantsLanding).
- `facts[]`: statements the client made, each with the exact words that support it. Only these may appear on the app as facts.
- `unknowns[]`: what an app like this normally states and the client did not give (prices, hours, reply times, address, credentials, policies). The default for each is to leave it out.
- `assumptions[]`: what you decided, in plain words, so the person can correct it.

`requirements.json`: one item per thing the person said: `id` (R1...), `text` (their words, trimmed), `source` (prompt, follow-up, steer, answer), `status` (open, designed, built, verified, not-done) and `servedBy` (page, section or feature). Every step reads it; QA turns every open item into a check; the closing report lists what is not done.

`plan.md`: one line per page and section with its job, then the feature list, then the asset list. It is also the to-do list: tick items as they finish; add the work you discover; never delete an item the person added or changed.

## The shared to-do list

Keep one list for everyone working on the project. The person's items are theirs: do not rename, reorder, untick or remove them. Do the items that fit your part and mark them started and done as you go. Do not hand back while one of the person's items that fits your part is still open; if you cannot do it, mark it blocked with the reason. At the end, nothing is left "in progress": each item is done, blocked with a note, or not done with a reason, and the final report says which.

## Narration and asking

- Say one sentence of why before a batch of actions; put something visible on screen early so the person is not waiting on a blank page.
- Decide taste and implementation yourself. Ask only for facts that are the person's and cannot be inferred (a name, a price, a booking link), or when the answer changes the architecture (an app that needs accounts, or one that does not).
- Never say work has started unless you made the tool call that starts it. "Generating it now" with no call is a lie that ends the turn with nothing done.
