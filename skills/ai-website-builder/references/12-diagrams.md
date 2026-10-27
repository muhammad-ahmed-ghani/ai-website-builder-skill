# Diagrams in an app

A diagram shows a relationship: what leads to what, who does what, what connects to what. It is built in markup (HTML and inline SVG), from the tokens, as real text. It is never a generated picture, an exported image or a hand-drawn illustration of an object, place or person (`04-build-system.md`, Images). Diagrams of geometry and structure (boxes, lines, axes, steps) are fine.

## 1. Does it earn its place?

Ask: would a visitor learn this faster from a good paragraph, a list or a table? If yes, write that. A list of items, a feature grid and a single box are not diagrams. Most reading apps need none or one ("how it works"); docs and tool apps may need several. Run the delete test: remove a node, a line, a label, and keep the removal if nothing is lost.

## 2. Principles

- Delete first. Every node is a distinct idea (two that always travel together are one). Every connector carries information (if the layout makes the relation obvious, remove the line).
- About 9 nodes and 12 connectors at most, then split into an overview and a detail. Target a calm density.
- One or two focal elements in the accent. Everything else is neutral (`fg`, `muted`, `line`). If you want to accent four things you have not decided what matters.
- Shape and a text label carry meaning. Colour is never the only carrier (a dashed line and the word "mocked", not just a grey one).
- Right-angle connectors with rounded corners (radius about 8). No diagonals. A line leaves and enters a box at the middle of an edge, at right angles.
- Draw lines first, boxes after, so lines sit behind boxes. No two lines share a path (offset by 12 px or more; hop at a single crossing). No line passes behind a box that is not its end. Several lines on one edge each get their own point, spread evenly.
- Labels sit clear of their line, at least 6 px, on a `bg`-coloured mask rect, short (about 14 characters), never rotated.
- Structural sizes on a 4 px grid: gaps 20 to 48, padding 8 to 16, radius 4 to 8, box height 48 or more. No shadows; hairline borders.
- Honest scale: time axes proportional, funnel and bar sizes proportional to real values, axes start at zero, no 3-D.
- A legend is a strip under the drawing and lists only what is used. Marginal notes: at most two, short, in clear margin, never crossing a line.

## 3. Types that matter for apps

| Need | Draw |
|---|---|
| How it works, onboarding, what happens after you book | Process or flowchart (3 to 6 steps, one branch at most) |
| A sign-in or API exchange, a request across a few parties | Sequence (5 lifelines at most) |
| What the visitor does versus what the studio does behind the scenes | Lanes or a service blueprint (5 lanes at most) |
| A real stack, trust scope or demo backend | Architecture, layers or nested boxes |
| A feedback cycle that is true | Loop (5 to 8 stations; if the last step does not feed the first, it is a flowchart) |
| History or roadmap the owner supplied | Timeline, proportional spacing |
| Parent and child, depends-on, entities | Tree, dependency graph, entity diagram (docs) |
| Compare quantities, a before and after | Bar or two-dot comparison, only with real or labelled demo data |
| Board, schedule, heat or flow of real records | A component fed by the demo store, not an illustration |

Skip: anything that draws a thing (an exploded gadget, a floor plan with furniture, a mascot), vendor logo sets, hand-drawn filters, dotted-paper backgrounds.

## 4. Honesty: a diagram is a claim

- Show only steps, components, integrations, timings and numbers the brief supports. No invented process step, turnaround time, security feature, integration or figure.
- Bounded by the source: never add a component to fill the layout, never drop one silently. Note in `.app-notes/` what was merged or left out.
- A diagram of how a working app is built marks real versus mocked: solid line and label "real" for what runs in the browser, dashed line and label "mocked" for what is demo data or not connected. It must match the closing report.
- Chart data is real (from the owner) or demo data, and the app says "Demo data" on screen. Never a chart of invented numbers in a reading app.

## 5. Drawing it from tokens (inline SVG)

Put the drawing in a component, not an `<img>`. Wrap it:

```tsx
<figure className="my-section">
  <svg viewBox="0 0 960 400" role="img" aria-labelledby="flow-title flow-desc" className="w-full h-auto">
    <title id="flow-title">How a booking works</title>
    <desc id="flow-desc">Four steps: you send a request, the studio confirms, you pay, you visit.</desc>
    <path d="M200 120h80q8 0 8 8v40" className="stroke-line fill-none" strokeWidth="1.5" />
    <rect x="40" y="96" width="160" height="48" rx="6" className="fill-surface stroke-line" />
    <text x="120" y="125" textAnchor="middle" className="fill-fg font-sans" fontSize="14">Send a request</text>
  </svg>
  <figcaption className="text-sm text-muted">The same four steps are listed below.</figcaption>
</figure>
```

- Colour only through token classes (`fill-surface`, `stroke-line`, `fill-fg`, `fill-muted`, `fill-accent`) or `var(--color-*)`. No hex, rgb or oklch literal, no palette class. Dark mode then follows the tokens: ONE drawing, never a dark copy. Arrowheads use `currentColor` set by a token text class.
- Fonts are the two token families (`font-sans`, `font-mono` for real technical strings such as paths and ports). No new font, no font request.
- Text is real `<text>` or HTML, never baked into a picture. No lettering inside an image file; no generated or exported image of a diagram.
- Rendered text is at least 12 px at 390 wide (names 14). If scaling the viewBox to the phone width makes it smaller, redraw narrower or use the fallback below.
- Accessible: `role="img"`, `aria-labelledby` naming a `<title>` (first child, 60 characters or fewer) and a `<desc>` that says what it shows (content, not geometry). Ids unique per diagram. A purely decorative SVG is `aria-hidden`.
- Static and complete. If it moves, use `Reveal` or `Stagger` once; nothing is hidden when the animation never runs; off under reduced motion; never animate geometry or routes.
- Right to left: the flow mirrors. Build it in HTML with logical properties, or mirror the SVG on purpose and check it.

## 6. Phone fallback

The page must not scroll sideways and essential content must reflow at 320 px. In this order:
1. A linear flow of 3 to 6 steps is an ordered list (`<ol>`) styled with tokens, connectors drawn with borders or pseudo-elements. It is real text, reflows, translates and works right to left.
2. A branching or layered drawing gets a purpose-drawn narrow (vertical) variant, swapped at a container width, or an ordered-list summary under it.
3. Only a genuinely wide technical drawing may sit in a labelled local scroller (`overflow-x: auto`, never inside an `overflow: hidden` ancestor), with the same information as text beside it.

Either way, the information in the diagram is also available as text on the page.

## 7. Checklist

Measurable (`scripts/check-app.mjs` or the browser at 390, 768, 1440):
- [ ] No horizontal page overflow at any size; no clipped SVG.
- [ ] Every rendered SVG text is 12 px or more at 390 wide (compare `getBoundingClientRect` height to the font size and the viewBox scale).
- [ ] Every non-decorative `<svg>` has `role="img"`, a `<title>` as first child, a `<desc>`, and ids unique in the document.
- [ ] No hex, rgb or oklch value and no palette class in an SVG attribute or class; `pnpm lint` passes.
- [ ] No `<img>` or generated image that is a diagram; no text drawn into a picture.
- [ ] Contrast: text pairs 4.5:1, lines and marks 3:1 against what they sit on (`contrast.mjs` on the token pairs used), light and dark.
- [ ] Reduced motion shows the complete drawing; the page reads with JavaScript late.

Judgement (look at the screenshots):
- [ ] A paragraph or table would not do the job as well.
- [ ] Nothing can be removed; at most 9 nodes, one or two accents.
- [ ] Every step, component, integration and number comes from the brief; real versus mocked is marked.
- [ ] Connectors are right-angled, nothing overlaps, labels clear of lines, no line behind a stranger box.
- [ ] Scales are honest.
- [ ] The phone view is the fallback you chose, not a shrunken copy; right to left checked if the app is.
- [ ] It looks like part of this app's direction, not a pasted figure.
