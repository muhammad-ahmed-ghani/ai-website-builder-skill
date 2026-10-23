# Design direction: choose from pictures, bind it, stay faithful to it

An app stops looking like a template when its look is chosen from real pictures of real alternatives, written down as a binding baseline, and then built to match the chosen picture. Decide the look before code. Never ship a stock look: reason it from this client and market.

## 1. Inspiration boards

A BOARD is one picture of ONE design direction, shown as four different screens of the same app, so the person sees the whole design before choosing it.

- Size and shape: one image about 2048 x 1280 (2K, 16:10 like a 1440 x 900 screen), a two-by-two grid of equal panels on thin flat white gutters (about 1 percent of the width).
- Panels by kind:
  - App: the hero, a section from the middle of the home page, a detail or use-case page, the closing call to action.
  - Product: the main screen (signed in, with demo data), a detail view (an item or thread opened), settings, an empty state.
  - Learning app: the home page, a lesson, a practice question, progress.
- ONE design: palette, typefaces, components, art direction, icons and logo are identical in all four panels; only the screen differs. Never four directions in one picture.
- Diversity lives BETWEEN boards. A round is six boards, six clearly different directions (different world, palette, type, density, art style), all on-brief for the person's request. Run all six at once: a medium-quality board costs about $0.02 and 35 seconds with a current image model (GPT Image 2.5 class), so six cost about $0.10 and take about as long as one.
- More until satisfied: after showing a round, offer "More inspiration" with an optional note ("warmer, less like the second"). The next round avoids the directions already shown and follows the note. Offer up to five rounds, only while someone is watching, and only while the budget still leaves about a third of it for the build. The person picks a whole board, never a single tile.
- Without an image model: render six rough HTML proofs of the first screen instead (same direction briefs), or at minimum write the six direction briefs and render the three strongest. Say which you did.

### How to get six different directions

Have two reasoners (or two passes) think about the SAME research with different lenses: (1) the physical reality of the offer (materials, place, process); (2) the visitor's feeling and the category's culture. Each proposes directions, then curate six that differ on the axes below. Reject sets where two share a medium and palette family.

Each direction is written as data a builder can use:
- name; why it fits this client; the world (a real material, place, artefact or print tradition as metaphor, not the obvious category image)
- medium (photograph, illustration, 3D, collage, type-only...), palette family with real hex values, type mood, composition, ground (light or dark), camera distance or scale
- motion idea; the real first-screen copy written for it (headline, line, button, navigation labels: a sketch, never final copy and never a fact)
- what to borrow; the risk; a fit score; and the three other screens of the board described one by one

### The board prompt

State the design once, then the four screens in picture order, then the layout clause. Template:

```
A single picture that is a two-by-two board of FOUR DIFFERENT SCREENS of ONE {app|working app|learning app} design, "{direction name}". The four panels are four screens of the same {thing}, not four designs: the palette, typefaces, components, art direction, icons and logo are identical in all four, and only the screen differs. Each panel is a crisp, flat 2D desktop screenshot, the {page|product} itself edge to edge with no browser window, tabs or address bar.
The client: {name}, {one-line summary}. For: {audience}. Their own words: "{request, trimmed}". The logo in every panel is the client's name "{name}" set in this design's type.
The design: world: {metaphor}. Made of: {medium}. Palette: {hex list} ({note}). Type: {type mood}. {A dark ground.|A light ground.}
Panel 1, top left: {screen title}. {what it shows; the exact words quoted: headline, line, button, navigation}
Panel 2, top right: {screen title}. {what it shows}
Panel 3, bottom left: {screen title}. {what it shows}
Panel 4, bottom right: {screen title}. {what it shows}
{Round 2+: The person looking at the earlier boards asked for this to change: "{note}". The design respects it. Earlier boards already showed "{names}"; this design is none of those looks.}
```

Always append this layout clause exactly:

> BOARD LAYOUT: one single picture, exactly four equal panels in a two-by-two grid (two on top, two below), each panel one complete 16:10 screen shown flat and front-on. The four panels are four DIFFERENT screens of ONE design: the same palette, typefaces, components, illustration or photograph style, icons and logo in every panel, so that they plainly belong to the same app, and no two panels show the same screen. The panels are separated by a thin flat white gutter, about one percent of the picture's width, that runs unbroken across the whole picture both ways, and the same white frames the whole board. Every panel stays inside its own cell: nothing crosses a gutter. No text, label, number or caption outside the panels, no browser window, tabs or address bar, no device frame, no drop shadow, no perspective, no hands. Render every line of copy quoted for a panel exactly and legibly inside that panel; any other small text may be placeholder. No real brand names or logos except the client's own name, no real people.

### Cutting a board into panels

Find the gutters by measuring pixels, not by assuming halves. Real boards had gutters of 10 to 26 pixels and unequal rows (a 53/47 split) that fixed halves would have cut through. Method: the flat, near-white run of rows (or columns) nearest the middle whose neighbours are busy; else the hardest full-length step; else refuse. A board with no seam on either axis is rejected and replaced by a single picture of that direction's first screen. Keep the whole board too: it is what the person looks at and chooses.

### How the pictures are used

They are inspiration, not specification: borrow structure, rhythm, mood, type character and composition; do not copy the sample wording, and do not reproduce a page literally. A concept must still work without any picture. The pictures live in `.app-notes/direction/`, never in `public/`, and are never shipped on the app.

## 2. Concepts: structurally different, each descended from a board

One board is one concept slot. For each, write a complete buildable art direction. Concepts must differ in STRATEGY, layout family, type voice, colour world, density and motion character. Three palettes on one layout are ONE concept.

Strategies (pick ones that fit; no two concepts share one): information-forward (the useful facts are the personality), image-led (a photograph carries the emotion and type serves it), voice-led (writing and typography carry it), artefact-led (the UI is an object from the world: ticket stub, timetable, seed packet), process-narrative (the page walks through the making), playful-illustrative. At least one concept is image-led or voice-led unless the thesis says imagery is "none".

Layout families (assign disjoint ones to concepts): editorial-columns, single-focus-stage, block-grid, swiss-grid, dense-panels, layered-depth, organic-collage, poster-collage, signage-symmetry, commerce-grid, data-narrative, docs-panes.

Method for each concept, in this order:
1. World referent: a real material, place, artefact or print tradition (kiln-fired test tiles, railway timetables, seed packets, hospital wayfinding, a lighthouse logbook). Everything else derives from it. It is not the obvious category image.
2. Proposition: one sentence, subject + relationship + meaning. "Premium and modern" is not a proposition.
3. Moves: two to six from the catalogue below, coherent together. Exactly one signature moment and one deliberate imperfection.
4. Colour in OKLCH from named physical sources. Neutrals tinted toward a hue of the referent (chroma 0.006 to 0.02), never pure grey. One scarce accent. fg and bg lightness differ by at least 0.55. No purple or indigo unless the referent demands it.
5. Type from installable families with real weights and axes; two text families at most, each with a job; an optional mono for facts.
6. Layout: family, grid, hero composition, density, padding rhythm, a radius philosophy (not a default 8px), elevation.
7. First screen at 1440 x 900, exactly: what sits where, relative scale, the order the eye travels. This is what gets rendered as the proof.
8. Imagery: obey the thesis' role. If essential, the hero's main subject is fully above the fold and large. One shared style sentence appended to every generation prompt so the set looks like one shoot. Never text baked into images. Never hand-drawn SVG or CSS pictures of objects, scenes or people.
9. Motion character: what animates, what never does.

### Typography ambition

A brand that may be confident (most are) leads with monumental type, the move `fat-display-statement`: the first-screen headline in an ultra-heavy, rounded, geometric display face (Dela Gothic One, Unbounded at 800 to 900, Anybody at width 150 and weight 900, Gluten or Funnel Display at 800), lowercase or sentence case, tracking -0.04em to -0.07em, leading 0.82 to 0.9, so large it fills 70 to 100 percent of the width (maximum around 160 to 220 px), on a near-black ground with off-white ink or the reverse, with a calm text face for everything else. Skip it only where the audience reads restraint as trust (a law practice, a clinic, a bank). Make at least half the concepts of a confident brand lead with it.

Install fonts from npm font packages (`@fontsource/*` or `@fontsource-variable/*`) and import them in `fonts.css`; never a Google Fonts link at runtime. Do not choose the faces models choose by habit (Inter, Space Grotesk, Fraunces, Geist) unless this client's world earns it.

## 3. Moves catalogue

Moves are rules a builder can execute, never moods. Combine coherently; a still, big-quiet layout does not also get kinetic type.

- Type: scale-extreme (headline 5 to 9x body, hierarchy by scale alone) · optical-size-pair (one variable serif, opsz max for display, min for text) · fat-display-statement · tight-display (leading 0.88 to 1.0, -0.03em) · width-axis-poster (expanded wdth for headlines) · mono-for-facts (tabular mono for prices, hours, dates) · one-italic-beat (one italic word per headline) · index-numerals (only when the order is real) · type-as-image (a giant cropped letterform is the hero) · lede-and-dropcap.
- Layout: asymmetric-split (7/5 or 8/4, never 50/50, with a real counterweight) · hairline-structure (1px rules, not cards) · index-rows (full-width rows instead of card grids, with a resting state for touch) · sticky-rail · offset-overlap (8 to 15 percent on purpose) · one-broken-element (strict grid, ONE element breaks it) · big-quiet (one sentence per screen, 160 to 240 px padding) · hierarchical-bento (one cell twice the area; equal tiles is the slop version) · artefact-as-ui · content-first-hero (the hero IS the menu, schedule, live product) · full-bleed-caption-rail · inverse-climax-band (exactly one inverted band).
- Colour: one-ink-one-paper · tinted-neutrals · material-palette · dark-ground-light-islands · duotone-system · accent-scarcity (at most three appearances per screen, always meaning "act here").
- Imagery: single-hero-light (one hero with directional light and a stated lens) · process-sequence (3 to 5 frames of the work) · object-on-flat · macro-texture (backgrounds and dividers only) · diagram-as-image (must be accurate) · type-only.
- Motion: clip-reveal-once · hover-invert-rows · number-ticker (real numbers only) · view-transitions (under 300 ms) · still-on-purpose. Immersive moves (scrub-film, scrub-frames, pinned-chapters, shader-hero, cutout-depth, mascot, loop-hero) are rare: at most ONE concept proposes one, only when the brief calls for a moving, scroll-driven page; never for information-first or high-trust briefs (law, health, money, public service, schools, documentation) or low-bandwidth ones. See `04-build-system.md`.
- Interaction: live-status (open now, closes in 2h: true and computed from real hours) · hover-preview-index · copy-snippet.
- Copy: specific-over-superlative ("8 people per class", not "amazing") · labels-as-voice · honest-limits (say what it is not for).

## 4. Craft laws

1. Decision order: purpose, hierarchy, grouping, composition, legibility, brand fit, craft, finish. If an earlier layer fails, polish cannot rescue it.
2. Hierarchy: ONE dominant element per screen; a second and third level clearly subordinate; equal emphasis everywhere is no hierarchy.
3. Scale contrast does more than weight or colour. Two or three type sizes with big ratios beat six with small ones.
4. Grouping: proximity and alignment before boxes. Space inside a group is smaller than space between groups. A border is a last resort.
5. Colour: design the value structure first (does it work in greyscale?). Never rely on hue alone for meaning.
6. Type: two families at most. Body 16 to 19 px, measure 45 to 75 characters, leading 1.45 to 1.7; display leading 0.88 to 1.1 with negative tracking. Numbers that compare are tabular.
7. Whitespace is a material: vary it deliberately; padding differs by role (hook, breath, index, climax).
8. Rhythm: alternate density, width, alignment and tone between neighbouring sections. Never four sections with one skeleton (heading, paragraph, grid).
9. Imagery shares one treatment (light, palette, crop logic). One strong image beats a grid of weak ones. Exact text is HTML, never inside an image.
10. Mobile is a recomposition, not a stack: reorder, recrop, rescale; the primary action stays in the thumb zone.
11. Signature plus imperfection: exactly one memorable moment, one deliberate irregularity. A design with several signature moments has none.
12. Conversion honesty: the primary action is visible without scrolling, named by its result, repeated only where the decision is ripe.

## 5. Refuse the AI defaults, unless earned

A choice is legitimate only if you can trace it to THIS client's world and audience in one sentence. An earned choice (a warm earthy palette for a clay studio) is not a tell; the same choice by habit is. Do not over-correct: refusing warmth for a pottery studio to avoid a cliché is as wrong as defaulting to it.

First-order tells: Inter, Roboto or system-ui by habit; indigo-violet or blue-purple gradients, glowing blobs, gradient text; three identical icon-in-circle feature cards; glassmorphism cards behind every block; emoji or sparkle icons; everything centred with one skeleton repeated; stock "diverse team at a laptop" imagery; generic calls to action (Get Started, Learn More); weightless words (seamless, unlock, elevate, empower, cutting-edge); fabricated testimonials, logo walls, round-number statistics.

Second-order tells (the "tasteful AI" defaults): cream paper plus italic serif hero plus terracotta accent; near-black ground plus acid green or lime accent plus mono labels on everything; Space Grotesk, Fraunces or Geist chosen because models choose them; mono uppercase micro-labels as an eyebrow on every section; a bento grid of equal tiles with tiny icons; a marquee scrolling for decoration; thin 1px borders with huge soft shadows on every card; "editorial" as an excuse for low-contrast grey text.

## 6. Proofs: judge renders, not descriptions

Render each concept as a real page: desktop first screen at 1440 x 900 and a phone view, in a real browser, with the hero picture in place. Feed measured layout problems (overlap, overflow, clipped text) back to the writer once. A proof that draws an object in CSS or SVG, or drops the hero picture, is rejected before anyone scores it. If the preview server answers 404 for the proof, that is not a proof: wait for it to serve.

## 7. The panel

Have four personas (or four independent passes) score the proofs next to real competitor screenshots from the research, citing what is visible:
- Art director: distinctiveness, type, colour, composition, clean craft. "Could this be swapped onto a competitor unchanged?"
- First-time visitor (the thesis audience in their state of mind): does this make you WANT to act today? A page can be correct and cold.
- Conversion and UX lead: five-second test, hierarchy, primary action, trust, mobile.
- Brand strategist: fit to audience and tension; does the voice sound like this client and no other?
- Slop prosecutor: lists first what makes each proof look AI-made or template-made (first and second order), BEFORE any praise; also flags over-correction.

Score 0 to 5 per criterion, distinctiveness (x3) and desire (x2.5) weighted heavier, then typography, colour, composition, hierarchy, brand fit, craft, and FIDELITY to the chosen picture (a fidelity of 1 or lower is ineligible). Anchors: 0 broken; 1 default template with swapped colours; 2 competent but generic; 3 coherent with one memorable move; 4 an idea a designer would defend, executed well; 5 could not be swapped onto another brand. Most work is a 2 or 3; consistently high scores mean you are flattering. Rank, pick a winner, and write what to carry from runners-up as specific rules for specific jobs ("type from B, spacing from C"), never a midpoint compromise. At most six atomic, located revisions for the winner: each names a token or composition change, never "make it more premium".

## 8. Bind the direction

The approved render is the north star. Write the baseline `DESIGN.md` (about 15 sections: identity and principles, colour with each token's job, type scale at 1440 and 390, layout, shape, motion, imagery, accessibility, 10 to 16 components with the token-utility recipes to build them, page recipes, voice and copy rules, anti-patterns this design refuses, the signature moment and the deliberate imperfection). Let code compute every fact (palette values, contrast matrix, type scale, spacing, radii, shadows, durations) so none can be invented; write the rest in words. Then write `src/styles/tokens.css` and `fonts.css` and run `scripts/contrast.mjs`. Binding rule: where DESIGN.md disagrees with your instinct, it wins; if code and baseline disagree after a change, fix the code; if the baseline must change, change it deliberately and say why.

Then a blueprint per page and section: its role in the rhythm, focal element, grid at desktop and mobile, real draft copy. Check: the rhythm varies, there is exactly one climax and one breath, the hook section IS the picture's first screen.

## 9. Fidelity: the chosen picture is the target

Fidelity used to decay at every hop (picture, concept, proof, build) because each stage got the picture only as extra text. Keep it explicit:
- Turn the chosen board's first panel into a measured spec: composition as shares of the frame, imagery (what, bleed, crop, where the text sits), type hierarchy at 1440, colour roles with hex, density, navigation and button style, atmosphere, the phone recomposition, and what NOT to copy (the sample wording).
- The first panel is the proof's target. Panels 2 to 4 are the references for the matching pages: each page's blueprint and builder is shown its own panel.
- The hero: draw the picture's whole frame again with no navigation, headline, button or lettering (an image-edit model with the picture as reference), and place it as the full-bleed background of the first screen with the text set over the picture's text area. That image is both the proof's hero and the app's hero. Without an editor, a text-to-image prompt written from the spec does the same job. An image-led first screen MUST contain its hero image (check this in the markup).
- After building, hold the home page beside the chosen picture and the proof: composition, imagery in the first screen, type scale, palette, mood. Write numbered, concrete fixes; at most two rounds.
- Polish treats fidelity as its first criterion: compare the built pages with the north star and baseline, apply ranked fixes, keep a round only if the gates do not regress and a side-by-side look says it improved.
