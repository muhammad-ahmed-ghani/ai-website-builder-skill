# Design craft: modes, the floor, the passes

`03` chooses the direction, `04` builds it, `06` proves it. This is the craft layer between them: what "designed" means in checkable terms, how hard to push, and the named passes that raise a build once it exists. Read it before the first concept, and again before you start refining.

## 1. Visitor mode: what does success look like on THIS screen?

Choose per screen, never per product. A tool's landing page is Persuade; a shop's help pages are Read.

| Mode | The visitor | Builds | Ambition shows as |
|---|---|---|---|
| Persuade | decides and acts | landing, marketing, campaign, pricing, an app's front door | a committed world, real imagery, one memorable move |
| Operate | completes a task | the working screens of a product, dashboard, editor, admin, a learning app's lessons | precision, scanability, native expectations; brand lives in details |
| Read | understands something | docs, articles, guides, help, changelogs, a learning app's explainers | structure for comprehension, a reading experience worth staying in |
| Experience | is inside the work | portfolio, gallery, showcase | the artefact leads from the first viewport; the interface recedes |

Reading apps are Persuade, Read or Experience; working apps are Operate (see `01`, `05`). Persuade and Experience get full commitment. On Operate and Read, patterns the visitor already knows earn their place and a wild layout is a defect. Typography, layout, colour and motion are all tuned to the mode: display type may carry the voice on Persuade, one well-tuned family and a fixed role scale are often right on Operate and Read.

## 2. Before drawing: a world, not a category

1. Name, in one sentence each: the product's own mechanism, the audience's real scene, the culture it lives in, and what this first screen must prove.
2. Write the page this category always ships, and its predictable opposite. Both are the rut. Keep them out of everything below.
3. From the audience's world (its print and screen traditions, notation, publications, identity programmes, places, rituals, artefacts) list seven concrete visual systems, ranked by resonance, each with one line on why it can carry the mechanism and one on how it looks (ground, main colours, type voices, the one signature). On Operate and Read screens do not borrow from the tools the audience operates (a terminal handed to a working screen is a costume).
4. The six boards of a round (`03` section 1) come from six different candidates, not from six adjectives applied to one. Include the least obvious candidate that still carries the mechanism.
5. Rut test: if someone could guess the aesthetic from the category alone, or from the category plus its avoidance, rework until neither guess is right.
6. The brief wins. A pinned aesthetic, era, material, font or palette is honoured even when it lands on a default below. Redirecting a clear brief to your taste is a failure. The defaults are what you reach for when the axis is free.

The looks generated work clusters around: warm cream ground with a high-contrast serif and a clay accent; near-black with one neon accent and glowing edges; broadsheet hairlines with an italic serif and small tracked labels; flat saturated ink with hard offset shadows. All are legitimate when the brief earns them. When an axis is free and you land in one, the self-check failed.

## 3. Colour and theme

- Pick a strategy before picking colours: **restrained** (tinted neutrals plus one accent), **committed** (one saturated colour carries 30 to 60 percent of the surface), **full palette** (three or four named roles), **drenched** (the surface is the colour). Persuade and Experience may take the bolder ones. Colour commits at page scale: fields that own whole regions, not accents scattered over a neutral.
- Light or dark is decided by the use scene, never by category: write one sentence (who uses this, where, under what light) and let it force the answer.
- Build roles, not swatches: surfaces, text, action, focus, borders, status. OKLCH ramps: vary lightness, drop chroma near white and black. Prefer explicit colours to chains of translucent overlays.
- On a coloured surface derive secondary text from that surface's hue or the foreground token. Never mid-grey. Dark mode is composed (its own elevation and contrast), not inverted.
- Contrast: body 4.5:1, large text 3:1, controls, icons and focus rings 3:1, in every state and both themes. `scripts/contrast.mjs` checks token pairs; the scan measures what is actually painted. Colour never carries meaning alone.

## 4. Type floor

- Choose faces like objects from the subject's world. These are what generators reach for without looking, so naming one needs a reason no other face could satisfy, and a subject association (books want a serif, tech wants a mono) is never that reason: Inter, Roboto, Geist, Fraunces, Plus Jakarta Sans, Space Grotesk, Space Mono, DM Sans, DM Serif, Outfit, Playfair Display, Cormorant, Lora, Newsreader, Instrument Sans and Serif, Syne, IBM Plex, Poppins, Montserrat, Manrope. A system face as the display voice of a committed world is a failure. Faces per writing system: `14-scripts-and-app-jobs.md`.
- Numbers the scan holds you to: body 16px or more, 45 to 75 characters per line (flagged past 80ch), display at most 6rem, tracking no tighter than -0.04em (-0.02 to -0.03 reads better) and no wider than 0.05em on reading text, adjacent roles at least 1.25x apart and the h1 at least 1.6x body, line height 1.5 to 1.7 on body, at most three weights and two families.
- `text-wrap: balance` on headings, `pretty` on body. Light text on dark: a little more leading, a touch more tracking, one step more weight.
- Paragraph rhythm comes from space or from first-line indent, not both.

## 5. Layout, depth, motion, and what the browser draws

- Squint test: blur the page; the primary element, the secondary element and the groups must still read in order. Group by proximity before adding a container. More space above a heading than below it (about twice). A 4px-based spacing scale; one value repeated everywhere is no rhythm.
- Cards are the lazy container: same-size icon-heading-text cards are not a page structure, and nested cards are always wrong. Declare elevation once (a border or a shadow, not a hairline under a wide soft shadow). Card radii 12 to 16px; pills are for small controls. Shadows have an offset and a blur.
- Motion: one authored moment, not one identical entrance on every section. Exponential ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`), never bounce or elastic. 100 to 150ms for feedback, 150 to 300 for state, 300 to 500 for layout or overlays, 500 to 800 only for the one authored entrance; exit faster than entrance. Content is visible by default and animated as an enhancement. Animate transform, opacity, filter, clip-path and mask, not layout properties. Every animation has a `prefers-reduced-motion` path that keeps meaningful feedback.
- The parts you did not draw still carry the design: text selection, caret, form accent, scrollbar, focus ring, link underline offset, numerals in tables. Theme them from the palette (the starter does; keep it). It is the cheapest signal that a page was built rather than assembled.
- States are part of the design: hover, focus, active, disabled, loading, error, empty, success, offline, long and missing content.

## 6. The tells, as rules

`scripts/check-app.mjs` runs `scripts/lib/design-scan.mjs` in the real browser at every size; its report ends with the fix for each rule that fired. `major` means a visitor cannot read or reach something; `minor` is a measurable defect with one right answer; `review` is a judgement call that never counts against the verdict: look at it, keep it only if the chosen inspiration picture earns it, and say why in the closing report.

| Group | Rules |
|---|---|
| Contrast and legibility | `low-contrast`, `low-contrast-aa`, `gray-on-color`, `text-over-image` (look at the screenshot), `tiny-text`, `undersized-ui-text`, `line-length`, `tight-leading`, `all-caps-body`, `wide-tracking`, `extreme-tracking`, `justified-text` |
| Hierarchy and rhythm | `flat-type-hierarchy`, `heading-rhythm`, `unbalanced-heading`, `straggler`, `too-many-weights`, `below-the-fold` |
| Painted wrong | `text-occluded`, `content-hidden-at-rest`, `broken-image`, `clipped-text`, `body-text-edge`, `cramped-padding`, `button-label-wraps` |
| Generator signatures | `nested-cards`, `side-tab`, `gradient-text`, `glow`, `hard-offset-shadow`, `ghost-card`, `icon-tile-stack`, `kicker-above-heading`, `numbered-labels`, `glyph-icon`, `decorative-pattern`, `cream-palette`, `overused-font`, `system-display-face` |
| Motion | `bounce-easing`, `marquee`, `pulsing-dot`, `motion-ignores-preference` |
| Keyboard | `focus-not-visible`, `focus-low-contrast` |
| Copy | `copy-residue`, `copy-placeholder`, `ai-prose-words`, `ai-prose-phrases`, `em-dash-saturation`, `aphoristic-cadence`, `unsourced-number` (with `--facts`) and the patterns in `10-copy-and-voice.md` |
| Polish | `browser-surfaces` |

A clean scan is a floor. It cannot tell you the hierarchy is right, the page has a point of view, or the copy sounds like the owner. That is the judgement pass in section 9.

## 7. Commit every atom

Navigation, buttons, inputs, links, focus ring, selection colour, empty states, error pages, the 404, the favicon: all rebuilt in the chosen world. A stock component inside a committed look is a lapse. Land the first build fully committed; later passes make the committed thing clearer, never weaker. The skeleton test: strip the copy from a section and look at the bare structure. If hierarchy and the system's devices no longer say what the section is and why it matters, the boldness lived in the words.

Truth binds claims, not demonstrations. In a working app, illustrative sample data is allowed when it is labelled as demo and listed for replacement. Commercial and factual claims (prices, customers, results, capabilities the product lacks) are never invented. Refusing a bold direction because its demo data does not exist yet is timidity wearing honesty's clothes.

## 8. The passes

Run a pass on a built, working app, one at a time, each scoped. **Refinement preserves; redesign replaces.** A refinement keeps the incumbent identity, behaviour, copy and everything outside its scope; a redesign keeps product truth, content and function but treats the old look as evidence and chooses a replacement world (`15-redesign-and-extension.md`). Never split the difference into polish on a look you meant to discard.

Every pass: state the thesis before editing (roles, contrast, thesis of the change), change only what it names, then verify with evidence (a measured number or a picture you looked at), never a bare "yes". Run the scan before and after.

| Pass | Use when | It does | It must not |
|---|---|---|---|
| critique | after a build, before refining | the two assessments of section 9 and a ranked fix list | edit anything |
| layout | hierarchy or rhythm reads flat | reading order, grouping, spacing scale, responsive recomposition | change the world |
| typeset | type feels default or inconsistent | role scale, measure, leading, faces within the world, wrap | add a family without a role only it can perform |
| colorize | grey or timid | roles, one dominant region, state colours, contrast in both themes | replace a confirmed brand colour |
| bolder | a section reads flat beside its neighbours | amplify what the system already owns: its motif, its scale; make the section a peak | touch neighbours, add colours, fonts or radii |
| quieter | loud or tiring | lower the volume of everything but the one move | flatten the signature |
| distill | cluttered | one job per screen; remove, merge, hide behind disclosure | remove a feature |
| harden | works only with perfect data | long, empty, huge, RTL, slow, offline, error, expanded translations (German about 30 percent longer) | hide a failure behind a spinner |
| animate | static where a state needs explaining | one focal moment, feedback, continuity; reduced-motion path | animate for its own sake |
| clarify | labels, errors, empty states are vague | name actions by result, errors by problem and recovery (`10`) | invent facts |
| adapt | a size or input mode is an afterthought | recompose for phone, tablet, laptop, touch, keyboard, zoom | stack the desktop |
| polish | last, before the report | system alignment, states, focus, spacing, copy consistency, cleanup of debug output | smuggle in a redesign |

Order: critique, then structure (layout, typeset, colorize), then the enhancements, then harden, then polish, then the full QA of `06`. After each pass the gates must not regress; a pass that made the scan or a side-by-side with the chosen picture worse is rolled back.

`bolder` and `quieter` are scoped amplifications: "everything else stays" is literal. Boldness that is only in the words fails the skeleton test.

## 9. Two isolated assessments, then a synthesis

1. **Design review (judgement), first, unanchored.** Think like a design director. Is the composition, interaction and visual language grounded in this product, or could an unrelated product use it unchanged? Then hierarchy, information architecture, emotional fit, discoverability, states, copy, accessibility. Cognitive load: more than four visible options at a decision point is a finding; reduce, group or disclose progressively. Emotional journey: the peak and the end are remembered; reassure at the high-stakes step.
2. **Measured evidence.** The scan and the browser capture of `06`, kept out of the first assessment so the numbers do not anchor the judgement.
3. **Synthesis.** Where the two agree, where the scan caught what the review missed, which scan findings are false positives (say so, with the reason). Rank by severity: P0 blocks use, P1 hurts a main task, P2 is a craft defect, P3 is polish.

With helpers, run 1 and 2 as two separate helpers that do not see each other's output. If you must do both alone, do 1 completely first and say in the report header that the review ran in a single context.

Score the ten usability heuristics from 0 to 4 (status visibility, match with the real world, user control, consistency, error prevention, recognition over recall, flexibility and efficiency, minimalist design, error recovery, help). Be honest: a 4 is genuinely excellent; most real interfaces total 20 to 32 of 40. Mark `n/a` with a one-line reason for heuristics that cannot apply (flexibility and help on a landing page) and renormalise the total to the number scored. Then walk the main action as two or three personas picked for this app and name what breaks for each: the impatient expert (shortcuts, skippable steps, batch actions), the first-timer (jargon, no visible next step), the keyboard and screen-reader user (order, names, focus), the one-handed phone user in bad light (thumb zone, tap size, contrast), the sceptic (what is unproven, what would make them leave). Specific red flags, never generic descriptions.

## 10. A second opinion from installed tools

If the person already has a dedicated design linter or critic installed (a skill or command that detects generator tells or reviews hierarchy and typography), you may run its detector against the built output as one more gate and read its critique after writing your own. Treat its findings as evidence under the same rules: measured beats opinion, false positives are named. Never install, download or run an executable the person did not ask for, never let it edit files, and never make this step a requirement: everything here works without it.
