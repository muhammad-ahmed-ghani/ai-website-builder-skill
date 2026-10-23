# Before you report: the checklist

Tick each from evidence you produced in this run. Anything you could not check goes in the report as NOT VERIFIED.

## Reading the request
- [ ] I can say in one sentence each: what the visitor will DO here, who it is for, and whether it is a reading app or a working app.
- [ ] `brief.json` has facts with spans, unknowns and assumptions; nothing on the app is invented.
- [ ] Every thing the person said is a line in `requirements.json` with a status and where it is served.

## Design
- [ ] At least six directions were shown as boards (or an honest fallback), each one design in four screens; one board was chosen.
- [ ] The concepts differ in strategy, layout family, type voice, colour world and density.
- [ ] `DESIGN.md` exists; tokens and fonts are written from it; `contrast.mjs` passes.
- [ ] The first screen of the built home page matches the chosen picture (composition, imagery, type scale, palette, mood).
- [ ] One signature moment and one deliberate imperfection are visible. No first-order or second-order AI tell without a reason.

## Build
- [ ] `pnpm lint` and `pnpm build` pass.
- [ ] Every route: one `<Seo>`, one `<h1>`, real copy, no "Replace me", no lorem, no `href="#"`, no dead form or button.
- [ ] Colour, font, radius, shadow and easing come only from tokens.
- [ ] Pictures: about one per screen, one shared style, through the manifest, with real alt text; none drawn by hand; no text inside pictures; no AI image captioned as a real event.
- [ ] The language and direction are right (`lang`, `dir`, real script, logical properties).
- [ ] A product: `/` is the working screen (or the learning home), demo accounts visible on the sign-in screen if there is one, empty/loading/error states, keyboard paths, "Demo data" note.

## Verification
- [ ] Built and served the PRODUCTION build; looked at every page at 390, 768 and 1440 with pictures.
- [ ] No horizontal scroll, no console error, no failed request, no hydration error (or each is classified as an artefact and listed).
- [ ] Every feature's acceptance steps ran and passed; every form and primary action works (or is listed as not verified).
- [ ] Contrast, tap targets, headings, landmarks, alt, labels checked.
- [ ] The critic compared the built app with the chosen board and the gaps are closed or listed.

## The report
- [ ] What I built; what is real and what is mocked; what the person must supply; what was verified and what was not; what is open; per requirement: built and verified, built not verified, or not done and why.
- [ ] Nothing in it says "tested", "polished", "accessible" or "working" without the evidence for that exact claim.
- [ ] Every to-do item is done, blocked with a note, or not done with a reason; none is left "in progress".
