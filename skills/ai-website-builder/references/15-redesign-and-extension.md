# Redesigning or extending an app that already exists

Read this when the person hands you a working app, or its code, and asks to redesign, restyle, polish, rebuild or extend it. The material is the app that exists. The rule that outranks the rest: what it says and what it does survives, unless the person agrees otherwise. Everything else in the method still applies (honesty, tokens, evidence), with the old app as the research.

## 1. Name the depth in your first message

Pick one. They do not blend. A polish that finds the concept wrong says so and recommends a full run; it never smuggles one in.

| Depth | Stays | Changes | Choose it when the person says |
|---|---|---|---|
| polish | the system and the layout | only what a rule or the design scan names: tells, contrast, states, motion, tokens | "polish", "keep our look", "fix what looks generated" |
| restyle | the layout and structure | the system: colour, type, radius, shadow, motion, controls | "restyle", "reskin", "new colours", "keep the layout" |
| full | the content and the wiring | the system and the composition: shape, first screen, sections, chrome | "redesign", "rebuild", "make it look designed" (the default for these words) |
| extension | everything that exists | new pages or features, built inside the existing system | "add a page", "add a feature", "extend it" |

A request that changes a working app without the word redesign (a new colour, one new screen) is an edit or an extension: do it as asked, in the app's own system, and do not run the rest of this file.

## 2. Read the app before you ask anything

Write `.app-notes/preflight.md`: the stack and framework, how it builds and runs, the fonts, palette, spacing and motion libraries it already uses (read from `package.json`, the tokens or style files, the font imports), whether a `DESIGN.md` or token file exists, the route table, the data layer. End it with two lines: what you will preserve, what you will introduce. A locked `DESIGN.md` is the system at every depth. If the app uses another stack, keep the stack: the method, the rules and the scripts do not depend on the starter. Conflicting signals (two palettes, two type systems): name the conflict, say which side you keep, ask once.

## 3. Record the old app before you touch it

Write `.app-notes/before/record.md` from the source and from the running app. Nothing is reconstructed from memory. List:
- Routes and, per page, its file and whether it is a page to read or a screen to work in.
- Links: visible text and target, for every one (navigation, footer, in-page, external).
- Forms: name, endpoint or handler, every field (name, type, required), and what the form does on success, on error and offline.
- Handlers: what every button, toggle and menu actually does, in one line each.
- Test hooks and queried selectors: `data-testid` and similar, ids, `name` attributes, classes that a script, test, analytics call or style hook reads (search the source for each before you rename it).
- Scripts, data calls and tracking calls.
- The heading tree (level and text) and every figure, number, name, price, date, quote and logo the app states.
- Images with their file and alt text; the logo asset; the brand: colours and faces that project files name, read from those files.
- Defects that already exist: dead links, `href="#"`, controls that do nothing, forms that go nowhere, failing console errors. Run `pnpm lint` where it exists and `scripts/check-app.mjs` on the old build; keep both reports in `.app-notes/before/`. Their counts are the Before line of the handoff.

Take screenshots of every route at 390, 768 and 1440 (check-app writes them). Look at them first, then write the read in four lines: what the app is for (who, the one action); what works and stays (at least one thing); what reads as generated or broken; what is unclear.

## 4. What must be kept

- Facts and claims: every one the old app states is carried over as found. Add each to `brief.json` `facts[]` with the span "carried from the existing app" and list those that no one has confirmed under "owner to verify" in the handoff, including ones that look doubtful (an unmeasured number, an award, a rating). Do not add a claim, section, action or picture the old app did not have, beyond what the person hands you or a rule requires (a focus ring, a pause control).
- Wiring: every link, form, field, handler, `id`, `name`, `type`, `href` and test hook. Edit markup inside the component that owns it. Never move logic, rename a prop that a caller uses, or drop an attribute a script reads. A prop that a rule empties (an emoji passed as an icon) may go, and is named in the handoff.
- Files: delete no file, remove no route and replace no component tree without a file-level plan the person has seen (the Files row in section 5). Do not edit a test to make the redesign pass. Documents in the repository (a readme, a prompt, a deck) describe the product; they are not copy for the pages.
- The brand when there is one: a logo, colour or face that project files name stays at every depth, with its values read from the files. A framework default or a look the rules refuse (a stock palette, a habit face) is not a brand: replace it, and say so in case it was one.
- The words: change copy only where the copy rules name it (`10-copy-and-voice.md`, the copy tells in lint). List every changed line with before and after. Terms, legal and consent text are never reworded. If the person says keep every word, keep them and list the rules that would have fired.
- Honesty still outranks keeping: a control that pretends (a dead button, a form that sends nothing, a login that accepts anything) is not "wiring to preserve". List it as an existing defect. Wire it for real, or remove it and say so in the handoff, with the person's agreement for anything they might miss.

## 5. Plan, then build

Open the plan with these rows and show them before you delete or rename anything: Depth and pages; Before (counts from section 3); Keeps (what you will carry); Files (edit: ..., create: ..., delete: none). Ask the person to commit or stash their work first so your changes are one reviewable diff; never do it for them.

Then build at the depth chosen:
- polish: fix in place. Single elements and tokens only. A structural finding (the first screen, the page shape, section rhythm, navigation) is printed with file and line and the depth that would settle it, not rebuilt.
- restyle: write tokens and fonts from the direction (the person picks from boards, or you derive it from the brief), then the shared components and chrome, then the pages, most visited first. Each page is checked before the next.
- full: run steps 3 to 6 of the operating loop (boards, concepts, proofs, binding) with the old content as the inventory. Build the first screen alone, look at it, then the rest.
- extension: new work uses the app's existing tokens, components, naming and file layout. If the existing design is generic, say so once and offer a restyle as a separate step; do not restyle pages you were not asked to touch.
In every depth the content is fixed: never ask the person for copy, an action or a picture the old app lacked. Put what they could supply in the handoff.

## 6. The diff: prove what was kept

Compare the finished app with the record, item by item, in a real browser and in the source:
- Links: every target in the record still resolves and still goes to the same place.
- Forms: submit each with test data through a flow (`check-app.mjs --flows`) with `assert_request`: the same fields reach the same endpoint, and the message the visitor sees follows the real answer.
- Handlers: a flow runs each in the record (open the menu, add the item, switch the tab).
- Hooks, ids and names: search the source for each one in the record. Headings and figures: compare the tree and the numbers.
- Run the project's own checks: type check, build, tests, `pnpm lint`. A redesign that breaks one is not finished.
Anything missing is restored, or written to `.app-notes/before/dropped.md` with the reason and the person's agreement. Each item ends as kept and verified, kept and not verified, or dropped with a reason. Any item not verified makes the verdict partial.

## 7. Review and handoff

The cold review (`06-qa-and-repair.md`) also gets the before screenshots and answers one more question: what did the old app do better? Name anything a visitor could do, read or find before that is harder now; if nothing, say so. A defect the review finds is fixed at any depth; a finding that asks for a new composition belongs to a deeper depth and is listed.

Close with this block, from measurements only:

```
Redesign   full, 3 pages (/, /pricing, /docs)
Before     lint 14 errors, scan 9 majors, 3 dead controls
After      lint 0 errors, scan 1 minor (kept on purpose: reason)
Kept       14 of 14 links, 5 of 5 form fields, 9 of 9 handlers, 11 of 11 headings, every figure
Changed    system and composition: tokens, first screen, sections, navigation
Dropped    none, or each item with its reason and who agreed
Yours      claims carried as found and not confirmed: (list); lines reworded: (before, after)
Not verified   anything the diff could not run, and why
Compare    .app-notes/before/shots and .app-notes/qa/contact-sheet.html (old beside new)
```

Then the usual closing report (`SKILL.md`), with every requirement in the ledger marked built and verified, built and not verified, or not done and why.
