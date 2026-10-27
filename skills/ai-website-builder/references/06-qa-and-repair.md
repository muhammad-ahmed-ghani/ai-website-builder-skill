# QA, critique and repair

"Done" is a claim until it is measured. An app that reads right in the code can collide on screen, and a gate that never looked is not a pass. The rule for the whole step: **evidence you looked at in this run beats anything you wrote**, and "could not look" is never "clean".

## 1. What must pass

Automatic gates (run them every time; fix before polishing):
- `pnpm lint` (token, accessibility, SEO, honesty and app rules) and `pnpm build` (typecheck, client build, SSR build, per-route prerender).
- A real browser at three sizes (390, 768, 1440): no horizontal scroll, no clipped text, no console errors, no uncaught errors, no failed requests, no hydration mismatch, no broken images or in-app links.
- Accessibility with an automated checker (axe or equivalent) plus the manual floor in `04-build-system.md`.
- Honesty gates: no invented proof, contact details, response times or guarantees; no third-party form endpoint; no dead form or dead call to action; no unused supplied asset; no AI image captioned as evidence.
- Performance budgets from `04-build-system.md`.
- Acceptance flows: every feature's steps (`.app-notes/flows.json`, run by `check-app.mjs --flows`) run in a real browser, each in a fresh visitor, and pass. A feature with no flow is not verified.
- Design detector, two tiers. Source (`pnpm lint`): raw colours, palette classes, banned or overused fonts, gradients and gradient text, `transition: all`, animated layout, bounce easing, emoji as icons, a removed focus outline, missing reduced-motion block, lorem, template copy. Rendered (`check-app.mjs` design scan, every size): contrast of what is actually painted, type hierarchy, measure and leading, covered or never-revealed text, button labels that wrap, the first screen below the fold, keyboard focus you cannot see, nested cards, side stripes, glows, marquees, default faces, generated-prose copy. Rules, severities and fixes: `09-design-craft.md` section 6. `major` and `minor` findings count; `review` findings need a decision and, if kept, a reason in the report.
- For a signature moment: the built home page has an element tagged `data-signature` and it actually moves (or is `static`).

## 2. Capture the evidence (run `scripts/check-app.mjs`, or do the same by hand)

Build once and serve the PRODUCTION build (`pnpm build && pnpm preview`), not the dev server: hot-reload noise and unprerendered markup hide the real problems. Open pages at their own address with a trailing slash (`/about/`), as a static host serves them.

For every page, at desktop 1440 and phone 390:
1. The first screen at full size.
2. Four to six pictures down the page, driving the scroll the way a visitor does (slowly, a pause per screen, so scroll-reveals and scrubbed scenes fire). Frames that look identical mean nothing responds to scroll.
3. The whole page in one tall picture.
4. Measured facts: horizontal overflow in px, contrast failures, tap targets under 44 px, missing alt, layout shift, timings, console and network problems, a preloader still showing, WebGL availability.
5. What the page offers: links, navigation, the phone menu button, calls to action, forms with their fields, in-page anchors.

Interaction states: the main button's hover and focus, a form's error state, the phone menu open. A state that shows no change is a finding.

One recording per size: a scripted visitor scrolls the home page slowly with a pause per screen, hovers the main button, tabs through the controls, opens the phone menu, follows every link the way a person would, scrolls each page, and types into every form with plausible test data (example.com addresses, a 555 number, a message that says it is a test; never the hidden bot-trap field), submits it, and writes down what the page said back.

Assemble the pictures so you can judge at a glance: a contact sheet (one row per page, desktop and phone, top, middle and end of each page), a strip per page, and the built first screen set beside the approved board and proof.

Then look. Choose the cheapest view that answers the question (a picture costs 500 to 1,500 tokens):
- Responsive layout: a grid of phone, tablet and laptop.
- Scroll behaviour, a pinned or scrubbed section: a filmstrip.
- Type, borders, alignment, small details: zoom on one region.
- Rhythm, density, how sections follow each other: the full page.
- "Does it match the promise?": compare with the proof or board; a difference mask shows where it departs.
- You cannot name what looks wrong: annotated (numbered boxes on overlap, overflow, contrast, tap targets, missing alt).
- A canvas, video or WebGL scene: motion. Static frames on a scene that should move are a finding.

Reading what comes back: each tile is labelled with device, size, route and scroll position; "61% size" means it is shown at 61 percent of real pixels, so small type there is not small on the page: zoom before judging type. Measured lines are facts; a feeling about a picture is not a fact: check it with a zoom or an annotated look before acting. If a look could not happen (preloader still showing, WebGL unavailable), say so instead of guessing.

## 3. Judge

- Measured issues come first and cannot be talked down by a model opinion: console errors, uncaught errors and failed requests are blockers by default; dead in-app links, broken images and anchors, sideways scroll, overlap, contrast, layout shift, a stuck loader, flows that fail (a menu that does not open, a page no link reaches, a form that shows no reaction), scroll stalls.
- Model or human findings about the same page, size and category are merged into the measured one; severity is the higher of the two.
- Consistency across pages, checked on the DOM: the same navigation and footer links on every page, one title and one h1 each, the header behaving the same.
- Does it read as ONE app? Do the pages share type, colour, spacing, components and voice?
- Does the first screen match the chosen board (composition, imagery, type scale, palette, mood)?
- Every open item in `requirements.json`: built, built and verified, or not done.

### Artefacts are not defects, but they are never hidden

Classify before repairing, mark them in the report, do not count them against the app, and do not send them to the repairer: a request the sandbox refused, an unreachable form endpoint in a local build, a build made without the endpoint address, a ResizeObserver notice, dev-server hot-reload noise, a cancelled media request, frame timing measured without a GPU, and a hydration mismatch caused by the preview server answering `/route` with another page's HTML (the starter's `vite.config.ts` redirects `/route` to `/route/` to prevent it). A form you could not verify because of an artefact is listed as NOT VERIFIED, which makes the verdict `partial`, not `pass`. A preloader still showing gets one more photograph after a 22 second wait before you call it stuck.

Verdict: `fail` with any open app blocker; `partial` with an open major or anything not verified; `pass` otherwise.

## 4. Repair

You are fixing defects that were measured; you did not see them yet, so look first.
- Reproduce before editing: screenshot the affected route and size; read the files the findings name.
- Fix the cause, not the symptom. Horizontal scroll at 390 has an offending element: find it and constrain it, do not hide it with `overflow-x: hidden` on the body.
- Smallest change that fixes the finding. No redesign, rename or reorganisation; touch nothing unrelated.
- Keep every token and the direction. A contrast fix changes which token pair is used or adds a scrim, never a raw colour.
- Typecheck, then look at the page again. If a finding cannot be fixed inside the constraints, say exactly why in the report; never hide it.
- Two failed attempts at the same defect: stop patching, read the whole component and rewrite it cleanly.
- A planned image that was never generated: remove its use or recompose the section so it reads well without it. Never hotlink a stock URL.
- A stub ("Replace me") still present means that section was never written: write it from its blueprint.
- Work in rounds, at most two or three, inside a clock. After each round re-run the same gates on only the affected pages and sizes (fresh captures; measured issues that are gone are fixed; model findings are re-checked). Roll the round back when the checks got worse, when it fixed nothing, or when it introduced at least as many new blockers or majors as it fixed. Stop after two stagnant rounds.
- A defect baked into a generated picture (a stray object, a wrong detail) cannot be fixed with CSS. Regenerate the picture with a corrected prompt, or recompose around it. Repair agents that have no image tool should say so and hand the item back as "needs a new picture", not retry.
- After fixes, run one more regression pass: the repairs themselves can break something. A weak design score (below about 55 of 100) deserves double the time.

## 5. The critic

Run it as two isolated assessments (`09-design-craft.md` section 9): the design review first and unanchored, the scan after, then a synthesis that names agreements, misses and false positives. Score the ten usability heuristics and walk two or three personas through the main action; severities P0 to P3. With helpers, use two separate helpers; alone, say in the report that the review ran in one context.

After the gates, review the built app against the chosen board, DESIGN.md and the proofs: two or three screenshots of the home page plus every page's first screen. Name numbered, concrete, located fixes (what, where, which token or composition change); the lead ranks them; a repairer applies them; a round is kept only if the gates do not regress and a side-by-side look says it improved. Treat critic noise honestly: a finding you cannot reproduce in a picture is not a finding.

## 6. The closing report

The report is assembled from what was measured, never from what you intended:
1. What you built, in plain words (pages, features), and for a product what is real and what is mocked.
2. What the person must supply (the Draft placeholders and unknowns, each as a one-line ask).
3. What was verified, with the verdict, and what was NOT verified and why.
4. What is still open, in plain words, with the severity.
5. Per item of the requirements ledger: built and verified, built not verified, or not done and why.

Never write "tested", "polished", "accessible", "working" or "responsive" unless the evidence for that exact claim exists. If a to-do item is neither done nor blocked at the end, the run is not finished: settle every item (done from evidence, blocked with a note, or not done with a reason). A finished run never shows an item still "in progress".
