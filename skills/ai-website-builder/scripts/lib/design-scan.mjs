/**
 * The design scan: what a real browser can measure about how a page is made, not only whether it works.
 *
 * `designScan` runs INSIDE the page (Playwright `page.evaluate(designScan)`), so it must stay self-contained: no imports, no closures over
 * anything outside the function. It returns raw hits, `{ rule: { count, evidence[], worst? } }`. `RULES` (used by the caller, outside the page)
 * says what each rule means, how serious it is and how to fix it.
 *
 * Severity:
 *   major   a visitor cannot read or reach the content (text unreadable, text covered, content never revealed, broken picture)
 *   minor   a craft defect that is measurable and has one right answer (line length, leading, contrast between AA and AAA targets, nesting)
 *   review  a judgement call (a default font, a kicker above a heading, a glow). Reported, never counted against the verdict: look, then decide,
 *           and write the reason in the closing report when you keep it. The chosen inspiration picture can earn any review item.
 *
 * Ideas come from published design-linting practice (see references/NOTICE.md); the implementation here is this skill's own.
 */

export const RULES = {
  "low-contrast": { severity: "major", category: "contrast", fix: "Text below 3:1 against what is painted behind it is unreadable. Re-pair the tokens (scripts/contrast.mjs) rather than nudging one element." },
  "low-contrast-aa": { severity: "minor", category: "contrast", fix: "Body text needs 4.5:1, large text 3:1. Fix the token pair so every use of it passes." },
  "gray-on-color": { severity: "minor", category: "contrast", fix: "Grey text on a coloured surface looks washed out. Derive the secondary text from that surface's own hue, or use the foreground token." },
  "text-over-image": { severity: "review", category: "contrast", fix: "Contrast cannot be measured over a picture. Look at the screenshot at 390 px: put the text on a scrim or a solid panel if any word is hard to read." },
  "text-occluded": { severity: "major", category: "layout", fix: "Something opaque sits on top of this text. Find the stacking or the overlap and fix it at the cause." },
  "content-hidden-at-rest": { severity: "major", category: "interaction", fix: "A large share of the text is invisible after the page was scrolled end to end. A reveal never fired. Content must be visible by default and animated only as an enhancement." },
  "broken-image": { severity: "major", category: "images", fix: "An image has no source, a placeholder source or failed to load. Use the real picture or remove the element." },
  "flat-type-hierarchy": { severity: "minor", category: "type", fix: "Adjacent type levels are too close in size to read as different jobs. Add a stronger step, or make one level differ in weight and space as well." },
  "line-length": { severity: "minor", category: "type", fix: "Lines run past about 80 characters. Cap prose at 65 to 75ch (the Prose primitive does)." },
  "tight-leading": { severity: "minor", category: "type", fix: "Multi-line body text with line height under 1.3. Use 1.5 to 1.7 for body copy." },
  "tiny-text": { severity: "minor", category: "type", fix: "Body text under 14px. Body is 16px unless a dense role justifies less." },
  "undersized-ui-text": { severity: "minor", category: "type", fix: "Interface text under 11px. Labels, links and buttons stay legible at 12px and up." },
  "all-caps-body": { severity: "minor", category: "type", fix: "Long passages in capitals are slow to read. Keep capitals for short labels." },
  "wide-tracking": { severity: "minor", category: "type", fix: "Letter spacing over 0.05em on reading text slows it down. Reserve wide tracking for short labels." },
  "extreme-tracking": { severity: "minor", category: "type", fix: "Letter spacing tighter than -0.04em costs legibility. Tighten display type optically, not destructively." },
  "justified-text": { severity: "minor", category: "type", fix: "Justified text in a narrow column leaves rivers of white. Use text-align: start or widen the measure." },
  "unbalanced-heading": { severity: "minor", category: "type", fix: "This heading wraps with its last line far shorter than the one above. Set text-wrap: balance on headings, or edit the copy." },
  "straggler": { severity: "review", category: "type", fix: "A paragraph ends on a very short last line. text-wrap: pretty on body copy fixes most; if it is deliberate, say so." },
  "heading-rhythm": { severity: "minor", category: "layout", fix: "Headings sit as close to the text above as to the text they introduce. Give a heading more space above than below so it binds to its own content." },
  "body-text-edge": { severity: "minor", category: "layout", fix: "Body text sits against the viewport edge. Give the container at least 16px of side padding (12px on very small phones)." },
  "clipped-text": { severity: "minor", category: "layout", fix: "Text is wider than its box and cut off. Let it wrap or truncate with an ellipsis on purpose." },
  "cramped-padding": { severity: "minor", category: "layout", fix: "A button or chip has almost no padding around its label. Give it room (about 0.75em by 1.25em at least)." },
  "nested-cards": { severity: "minor", category: "slop", fix: "Cards inside cards add noise and depth for nothing. Flatten: use spacing, type and dividers inside a card." },
  "side-tab": { severity: "minor", category: "slop", fix: "A thick coloured border on one side of a box is the most recognisable AI tell. Use a quieter accent or remove it." },
  "gradient-text": { severity: "minor", category: "slop", fix: "Gradient text is decoration. Emphasis comes from weight and size, in a solid token colour." },
  "glow": { severity: "minor", category: "slop", fix: "A coloured halo with no offset is a default 'cool' look. Real depth has an offset and a soft blur in a neutral shadow." },
  "bounce-easing": { severity: "minor", category: "motion", fix: "Overshoot and elastic curves look dated. Decelerate smoothly: the ease-out token." },
  "marquee": { severity: "minor", category: "motion", fix: "Continuously scrolling content demands attention it has not earned and hides half its text. Use a static row." },
  "motion-ignores-preference": { severity: "minor", category: "motion", fix: "With prefers-reduced-motion set, an infinite animation is still running. Honour the preference globally." },
  "overused-font": { severity: "review", category: "type", fix: "A face every generator reaches for. Keep it only if the chosen inspiration picture uses it; otherwise source a face with a point of view." },
  "system-display-face": { severity: "review", category: "type", fix: "The headline is set in a system face. Source and self-host a face that matches the approved lettering." },
  "cream-palette": { severity: "review", category: "slop", fix: "A warm cream page background is the default 'tasteful' surface. Keep it only if the picture and the subject's world earn it." },
  "hard-offset-shadow": { severity: "review", category: "slop", fix: "An unblurred shadow offset by 4px or more belongs to a neobrutalist direction. Is that the chosen direction?" },
  "ghost-card": { severity: "review", category: "slop", fix: "A row of cards each with a hairline border and a wide soft shadow is a generated-UI signature. Declare elevation once: a border or a shadow." },
  "icon-tile-stack": { severity: "review", category: "slop", fix: "A small rounded icon tile above a heading, repeated, is the universal feature-card template. Try icon and heading side by side, or no icon." },
  "kicker-above-heading": { severity: "review", category: "slop", fix: "A tiny capitalised label directly above a heading. Delete it and let the heading carry the weight." },
  "numbered-labels": { severity: "review", category: "slop", fix: "Section numbers (01, 02, 03) are scaffolding unless the order itself carries meaning." },
  "glyph-icon": { severity: "review", category: "slop", fix: "An emoji or glyph standing in for an icon. Use one drawn icon set at one stroke weight." },
  "pulsing-dot": { severity: "review", category: "motion", fix: "A pulsing dot simulates liveness. Keep it only if it is tied to genuinely live data." },
  "decorative-pattern": { severity: "review", category: "slop", fix: "Stripes or a grid-line background with no canvas, map or blueprint under them is decoration. Use a plain surface or a texture from the subject's world." },
  "em-dash-saturation": { severity: "review", category: "copy", fix: "Many em dashes in the copy is a cadence tell. Vary the punctuation." },
  "aphoristic-cadence": { severity: "review", category: "copy", fix: "Several sections end on a short rebuttal ('X. No Y.' / 'Not a feature. A platform.'). Write each ending to fit its own point." },
  "copy-residue": { severity: "major", category: "copy", fix: "A chat reply leaked into the copy. Delete it and write the line from a fact the owner gave." },
  "copy-placeholder": { severity: "major", category: "copy", fix: "Placeholder text ships on the page. Write the real line, or omit it and say so in the report." },
  "ai-prose-words": { severity: "review", category: "copy", fix: "Words that mark generated prose. Replace each with the plain word, or with the specific fact." },
  "ai-prose-phrases": { severity: "review", category: "copy", fix: "Stock phrases that mark generated prose. Say the specific thing instead." },
  "below-the-fold": { severity: "minor", category: "layout", fix: "At a laptop size the headline or the first call to action sits below the fold. The first screen must say what this is and offer the next step." },
  "button-label-wraps": { severity: "minor", category: "layout", fix: "A button label wraps to two lines. Shorten the label, then nowrap, then move it into a menu." },
  "too-many-weights": { severity: "minor", category: "type", fix: "More than three font weights carry running text. Two or three give a clearer hierarchy and fewer font files." },
  "focus-not-visible": { severity: "major", category: "a11y", fix: "Tabbing to this control changes nothing you can see. Style :focus-visible with a ring that reaches 3:1 against what it sits on." },
  "focus-low-contrast": { severity: "minor", category: "a11y", fix: "The focus ring exists but is under 3:1 against the surface behind it. Use the focus token on that surface or add an offset ring." },
  "unsourced-number": { severity: "review", category: "copy", fix: "A number on the page that the brief's facts do not contain. Trace it to a fact, or remove it. Demo data in a working app that says so on screen is exempt." },
  "browser-surfaces": { severity: "review", category: "polish", fix: "Parts the browser draws still ship defaults: text selection, caret, form accent, scrollbar, underline offset, numerals. Theme them from the palette (see references/09-design-craft.md)." },
};

/** In-page. Returns `{ hits, stats }`. Async because it scrolls the page in viewport-sized steps to measure what is painted. */
export async function designScan(opts = {}) {
  const tells = opts?.tells ?? null;
  const hits = {};
  const hit = (rule, evidence, worst, sev) => {
    const h = (hits[rule] ??= { count: 0, evidence: [] });
    h.count++;
    if (sev) h.sev = sev;
    if (evidence && h.evidence.length < 4) h.evidence.push(String(evidence).slice(0, 140));
    if (worst !== undefined) h.worst = h.worst === undefined ? worst : Math.min(h.worst, worst);
  };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const label = (el) => `${el.tagName.toLowerCase()}${typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : ""}`;
  const snip = (el, n = 28) => `"${(el.textContent || "").trim().replace(/\s+/g, " ").slice(0, n)}"`;

  // ---------- colour ----------
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const colours = new Map();
  const parse = (css) => {
    if (colours.has(css)) return colours.get(css);
    let out = null;
    try {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = "rgba(1, 2, 3, 0.5)";
      const before = cx.fillStyle;
      cx.fillStyle = css;
      if (cx.fillStyle !== before || css === before) {
        cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data;
        out = [d[0], d[1], d[2], d[3] / 255];
      }
    } catch {
      out = null;
    }
    colours.set(css, out);
    return out;
  };
  const lum = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const hsl = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return { h: 0, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s, l };
  };
  const over = (top, bottom) => {
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1);
  };
  const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const cssOf = (el) => getComputedStyle(el);

  // ---------- which elements carry text ----------
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD", "TITLE", "META", "LINK", "OPTION", "SVG", "PATH", "CANVAS", "VIDEO", "IFRAME"]);
  const all = [...document.body.querySelectorAll("*")].filter((el) => !SKIP.has(el.tagName.toUpperCase()) && !el.closest("svg"));
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = cssOf(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  };
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent).join(" ").replace(/\s+/g, " ").trim();
  const textEls = all.filter((el) => ownText(el).length > 0 && visible(el) && !el.closest("[aria-hidden='true'], [hidden]"));
  const fs = (el) => parseFloat(cssOf(el).fontSize) || 16;
  const bodyish = (el) => ["P", "LI", "DD", "BLOCKQUOTE"].includes(el.tagName);
  const nearestOpaqueBg = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = parse(cssOf(e).backgroundColor);
      if (c && c[3] >= 0.99) return c;
    }
    return [255, 255, 255, 1];
  };

  // ---------- type: sizes, hierarchy, reading ----------
  const sizeByChars = new Map();
  for (const el of textEls) {
    if (!bodyish(el) && el.tagName !== "SPAN" && el.tagName !== "DIV") continue;
    const s = Math.round(fs(el) * 10) / 10;
    sizeByChars.set(s, (sizeByChars.get(s) ?? 0) + ownText(el).length);
  }
  const bodySize = [...sizeByChars.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 16;
  const headSize = (tag) => Math.max(0, ...[...document.querySelectorAll(tag)].filter(visible).map(fs));
  const h1 = headSize("h1"), h2 = headSize("h2"), h3 = headSize("h3");
  if (h1 && h1 / bodySize < 1.6) hit("flat-type-hierarchy", `h1 ${h1}px against body ${bodySize}px (x${(h1 / bodySize).toFixed(2)})`);
  else if (h1 && h2 && h1 / h2 < 1.1) hit("flat-type-hierarchy", `h1 ${h1}px and h2 ${h2}px read as one level`);
  else if (h2 && h3 && h2 / h3 < 1.08) hit("flat-type-hierarchy", `h2 ${h2}px and h3 ${h3}px read as one level`);
  else if ((h3 || h2) && Math.max(h3, h2) / bodySize < 1.15) hit("flat-type-hierarchy", `h2/h3 ${Math.max(h3, h2)}px against body ${bodySize}px`);

  const measureCache = new Map();
  const charWidth = (el) => {
    const cs = cssOf(el);
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if (measureCache.has(font)) return measureCache.get(font);
    cx.font = font;
    const w = cx.measureText("0").width; // the CSS ch unit
    measureCache.set(font, w);
    return w;
  };
  const lineRects = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
    const lines = [];
    for (const r of rects) {
      const line = lines.find((l) => Math.abs(l.top - r.top) < r.height * 0.5);
      if (line) { line.left = Math.min(line.left, r.left); line.right = Math.max(line.right, r.right); }
      else lines.push({ top: r.top, left: r.left, right: r.right });
    }
    return lines.sort((a, b) => a.top - b.top).map((l) => ({ ...l, width: l.right - l.left }));
  };

  let headingsAbove = 0, headingsMeasured = 0;
  for (const el of textEls) {
    const cs = cssOf(el);
    const size = fs(el);
    const text = ownText(el);
    const isBody = bodyish(el);
    const r = el.getBoundingClientRect();
    if (isBody && text.length >= 120) {
      const inner = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const cpl = inner / charWidth(el);
      if (cpl > 80) hit("line-length", `${Math.round(cpl)}ch wide: ${label(el)}`);
      if (cs.textAlign === "justify" && cpl < 40 && cs.hyphens !== "auto") hit("justified-text", `${label(el)} justified in a ${Math.round(cpl)}ch column`);
    }
    if (isBody && size <= 24) {
      const lh = cs.lineHeight === "normal" ? size * 1.2 : parseFloat(cs.lineHeight);
      if (lh / size < 1.3 && r.height >= lh * 1.6) hit("tight-leading", `line height ${(lh / size).toFixed(2)} on ${label(el)} (${size}px)`);
    }
    if (isBody && size < 14 && text.length > 40) hit("tiny-text", `${size}px ${label(el)}`);
    else if (!isBody && size < 11 && !/^(SUP|SUB|SMALL)$/.test(el.tagName)) hit("undersized-ui-text", `${size}px ${snip(el)}`);
    if (isBody && cs.textTransform === "uppercase" && text.length > 60) hit("all-caps-body", `${label(el)} (${text.length} characters)`);
    const ls = cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing) / size;
    if (isBody && ls > 0.05 && text.length > 60) hit("wide-tracking", `${ls.toFixed(2)}em on ${label(el)}`);
    if (ls < -0.04) hit("extreme-tracking", `${ls.toFixed(3)}em on ${label(el)}`);
    if (/^H[1-3]$/.test(el.tagName) && !/balance|pretty/.test(cs.textWrap || cs.textWrapStyle || "")) {
      const lines = lineRects(el);
      if (lines.length >= 2) {
        const last = lines[lines.length - 1].width, prev = lines[lines.length - 2].width;
        if (last < prev * 0.3) hit("unbalanced-heading", `${snip(el)} ends on a short last line`);
      }
    }
    if (el.tagName === "P" && text.length > 160 && !/pretty|balance/.test(cs.textWrap || "")) {
      const lines = lineRects(el);
      if (lines.length >= 3 && lines[lines.length - 1].width < Math.min(60, r.width * 0.12)) hit("straggler", `${snip(el)} ends on a one-word line`);
    }
    if (isBody && text.length > 30) {
      const edge = vw <= 480 ? 12 : 16;
      if (r.left < edge - 1 || r.right > vw - edge + 1) hit("body-text-edge", `${label(el)} at ${Math.round(r.left)}px / ${Math.round(vw - r.right)}px from the edges`);
    }
    if ((cs.overflow === "hidden" || cs.overflowX === "hidden" || cs.overflowX === "clip") && el.scrollWidth > el.clientWidth + 2 && cs.textOverflow !== "ellipsis" && !/^(HTML|BODY)$/.test(el.tagName) && text.length > 3 && cs.whiteSpace === "nowrap" && el.clientWidth > 8 && r.height > 8)
      hit("clipped-text", `${snip(el)} is ${el.scrollWidth}px in a ${el.clientWidth}px box`);
    if (/^(BUTTON|A)$/.test(el.tagName) || el.getAttribute("role") === "button") {
      const bg = parse(cs.backgroundColor);
      const boxed = (bg && bg[3] > 0.05) || parseFloat(cs.borderTopWidth) > 0;
      const tight = (parseFloat(cs.paddingLeft) < 8 && parseFloat(cs.paddingRight) < 8) || r.height < size * 1.45;
      if (boxed && text.length < 40 && tight) hit("cramped-padding", `${snip(el)} ${Math.round(r.width)}x${Math.round(r.height)} with ${cs.paddingLeft} side padding`);
    }
    if (/^H[2-3]$/.test(el.tagName)) {
      const prev = el.previousElementSibling, next = el.nextElementSibling;
      if (prev && next && visible(prev) && visible(next)) {
        headingsMeasured++;
        const above = r.top - prev.getBoundingClientRect().bottom;
        const below = next.getBoundingClientRect().top - r.bottom;
        if (above <= below + 1) headingsAbove++;
      }
    }
    if (cs.fontFamily && /^H1$/.test(el.tagName)) {
      /* faces are read below, once per page */
    }
  }
  if (headingsMeasured >= 4 && headingsAbove / headingsMeasured >= 0.6) hit("heading-rhythm", `${headingsAbove} of ${headingsMeasured} headings sit as close to the text above as below`);

  // ---------- the first screen, buttons that wrap, weights in use ----------
  if (vw >= 1024) {
    const h1e = [...document.querySelectorAll("main h1, h1")].find(visible);
    if (h1e) {
      const hb = h1e.getBoundingClientRect().bottom + window.scrollY;
      const boxedAction = [...document.querySelectorAll("main a, main button, a, button")].find((e) => {
        if (!visible(e) || e.closest("nav, header") || (e.textContent || "").trim().length < 2) return false;
        const cs = cssOf(e);
        const bg = parse(cs.backgroundColor);
        return (bg && bg[3] > 0.05) || parseFloat(cs.borderTopWidth) > 0;
      });
      const ab = boxedAction ? boxedAction.getBoundingClientRect().bottom + window.scrollY : 0;
      if (hb > vh) hit("below-the-fold", `the h1 ends at ${Math.round(hb)}px in a ${vh}px window`);
      else if (ab > vh && !h1e.closest("[data-allow-fold]")) hit("below-the-fold", `the first action ends at ${Math.round(ab)}px in a ${vh}px window`);
    }
  }
  for (const el of textEls) {
    if (!(/^(BUTTON|A)$/.test(el.tagName) || el.getAttribute("role") === "button")) continue;
    const cs0 = cssOf(el);
    const bg0 = parse(cs0.backgroundColor);
    const boxed0 = (bg0 && bg0[3] > 0.05) || parseFloat(cs0.borderTopWidth) > 0;
    const txt = ownText(el);
    if (boxed0 && txt.length < 32 && lineRects(el).length >= 2) hit("button-label-wraps", `${snip(el)} wraps to two lines`);
  }
  const weightChars = new Map();
  for (const el of textEls) {
    const w = String(Math.round(parseInt(cssOf(el).fontWeight, 10) / 100) * 100);
    weightChars.set(w, (weightChars.get(w) ?? 0) + ownText(el).length);
  }
  const weightsUsed = [...weightChars.entries()].filter(([, n]) => n >= 30).map(([w]) => w);
  if (weightsUsed.length > 3) hit("too-many-weights", `weights in running use: ${weightsUsed.sort().join(", ")}`);

  // ---------- faces and palette (judgement) ----------
  const OVERUSED = ["inter", "roboto", "fraunces", "geist", "plus jakarta sans", "space grotesk", "dm sans", "dm serif display", "dm serif text", "outfit", "playfair display", "instrument sans", "instrument serif", "cormorant", "cormorant garamond", "lora", "newsreader", "crimson text", "crimson pro", "syne", "space mono", "ibm plex sans", "ibm plex mono", "poppins", "montserrat", "manrope"];
  const SYSTEM = ["arial", "arial black", "helvetica", "helvetica neue", "impact", "system-ui", "-apple-system", "segoe ui", "sans-serif", "ui-sans-serif"];
  const first = (css) => (css.split(",")[0] || "").replace(/["']/g, "").trim().toLowerCase();
  const h1El = [...document.querySelectorAll("h1")].find(visible);
  const bodyEl = document.querySelector("main p, p") ?? document.body;
  const displayFace = h1El ? first(cssOf(h1El).fontFamily) : "";
  const bodyFace = first(cssOf(bodyEl).fontFamily);
  for (const [role, f] of [["headline", displayFace], ["body", bodyFace]]) {
    if (f && OVERUSED.includes(f)) hit("overused-font", `${role} is set in ${f}`);
  }
  if (displayFace && SYSTEM.includes(displayFace)) hit("system-display-face", `headline falls back to ${displayFace}`);
  const pageBg = parse(cssOf(document.body).backgroundColor);
  const bgC = pageBg && pageBg[3] > 0.5 ? pageBg : parse(cssOf(document.documentElement).backgroundColor);
  if (bgC && bgC[3] > 0.5) {
    const { h, s, l } = hsl(bgC);
    if (h >= 30 && h <= 65 && s >= 0.12 && s <= 0.65 && l >= 0.88 && l <= 0.97) hit("cream-palette", `page background ${hex(bgC)}`);
  }

  // ---------- shape and depth ----------
  const boxShadows = (cs) => {
    const raw = cs.boxShadow;
    if (!raw || raw === "none") return [];
    const parts = raw.split(/,(?![^(]*\))/).map((s) => s.trim());
    return parts.map((p) => {
      const colour = p.match(/(rgba?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|color\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8})/i)?.[0];
      const nums = (p.replace(colour ?? "", "").match(/-?[\d.]+px/g) ?? []).map((n) => parseFloat(n));
      return { colour, inset: /\binset\b/.test(p), x: nums[0] ?? 0, y: nums[1] ?? 0, blur: nums[2] ?? 0, spread: nums[3] ?? 0 };
    });
  };
  const cardLike = (el, cs) => {
    const r = el.getBoundingClientRect();
    if (r.width < 100 || r.height < 40 || /^(INPUT|BUTTON|SELECT|TEXTAREA|A|IMG|BODY|HTML|MAIN|SECTION|HEADER|FOOTER|NAV)$/.test(el.tagName)) return false;
    const radius = parseFloat(cs.borderTopLeftRadius);
    const shadow = boxShadows(cs).some((s) => !s.inset && (s.blur > 0 || s.y > 0));
    const border = parseFloat(cs.borderTopWidth) > 0 && parseFloat(cs.borderTopWidth) <= 2 && parse(cs.borderTopColor)?.[3] > 0.05;
    const bg = parse(cs.backgroundColor);
    return radius >= 6 && (shadow || border) && !!bg && bg[3] > 0.05;
  };
  const cards = new Set();
  const styled = [];
  for (const el of all) {
    if (!visible(el)) continue;
    const cs = cssOf(el);
    if (cardLike(el, cs)) cards.add(el);
    styled.push([el, cs]);
  }
  let ghost = 0;
  const ghostParents = new Map();
  for (const el of cards) {
    if (el.parentElement && [...cards].some((c) => c !== el && c.contains(el) && c.getBoundingClientRect().width < window.innerWidth * 0.98)) {
      hit("nested-cards", `${label(el)} inside ${label([...cards].find((c) => c !== el && c.contains(el)))}`);
    }
    const cs = cssOf(el);
    const sh = boxShadows(cs).find((s) => !s.inset && s.blur >= 20);
    if (sh && parseFloat(cs.borderTopWidth) === 1) ghostParents.set(el.parentElement, (ghostParents.get(el.parentElement) ?? 0) + 1);
  }
  for (const [, n] of ghostParents) if (n >= 3) ghost++;
  if (ghost) hit("ghost-card", `${ghost} row(s) of cards with a hairline border and a wide shadow`);

  const seenAnimations = [];
  for (const [el, cs] of styled) {
    const bw = [cs.borderLeftWidth, cs.borderRightWidth, cs.borderTopWidth, cs.borderBottomWidth].map(parseFloat);
    const r = el.getBoundingClientRect();
    for (const [i, side] of ["Left", "Right"].entries()) {
      if (bw[i] >= 3 && bw[2] <= 1 && bw[3] <= 1 && bw[1 - i] <= 1 && cs[`border${side}Style`] !== "none" && r.height > 24 && r.width > 80) {
        const c = parse(cs[`border${side}Color`]);
        if (c && c[3] > 0.3 && hsl(c).s > 0.25) hit("side-tab", `${bw[i]}px ${side.toLowerCase()} border on ${label(el)}`);
      }
    }
    if ((cs.backgroundClip === "text" || cs.webkitBackgroundClip === "text") && /gradient/.test(cs.backgroundImage)) hit("gradient-text", `${snip(el)}`);
    for (const s of boxShadows(cs)) {
      const c = s.colour ? parse(s.colour) : null;
      if (!s.inset && c && s.x === 0 && s.y === 0 && s.blur >= 12 && c[3] >= 0.15 && hsl(c).s > 0.45) hit("glow", `${label(el)} box-shadow ${s.blur}px halo ${hex(c)}`);
      if (!s.inset && s.blur === 0 && (Math.abs(s.x) >= 4 || Math.abs(s.y) >= 4) && r.width > 60) hit("hard-offset-shadow", `${label(el)} shadow ${s.x}px ${s.y}px, no blur`);
    }
    const ts = cs.textShadow;
    if (ts && ts !== "none") {
      const c = ts.match(/(rgba?\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]{3,8})/i)?.[0];
      const nums = (ts.replace(c ?? "", "").match(/-?[\d.]+px/g) ?? []).map(parseFloat);
      const col = c ? parse(c) : null;
      if (col && nums[0] === 0 && nums[1] === 0 && nums[2] >= 8 && col[3] >= 0.2 && hsl(col).s > 0.45) hit("glow", `${label(el)} text-shadow halo`);
    }
    const bi = cs.backgroundImage;
    if (bi && bi !== "none") {
      if (/repeating-linear-gradient/.test(bi)) hit("decorative-pattern", `${label(el)} repeating gradient`);
      else if ((bi.match(/linear-gradient/g) ?? []).length >= 2 && /\d+px \d+px|\d+px/.test(cs.backgroundSize) && cs.backgroundSize !== "auto" && !/cover|contain/.test(cs.backgroundSize)) hit("decorative-pattern", `${label(el)} grid lines`);
    }
    const tf = `${cs.transitionTimingFunction},${cs.animationTimingFunction}`;
    for (const m of tf.matchAll(/cubic-bezier\(([^)]*)\)/g)) {
      const [, y1, , y2] = m[1].split(",").map(Number);
      if (y1 < 0 || y1 > 1 || y2 < 0 || y2 > 1) { hit("bounce-easing", `${label(el)} ${m[0]}`); break; }
    }
    const tileSize = r.width >= 32 && r.width <= 72 && Math.abs(r.width - r.height) < 6;
    if (tileSize && parseFloat(cs.borderTopLeftRadius) >= 8 && el.querySelector("svg, img") && el.nextElementSibling && /^H[2-4]$/.test(el.nextElementSibling.tagName)) {
      seenAnimations.push(el.parentElement);
    }
  }
  const tiles = new Map();
  for (const p of seenAnimations) if (p?.parentElement) tiles.set(p.parentElement, (tiles.get(p.parentElement) ?? 0) + 1);
  for (const [, n] of tiles) if (n >= 3) hit("icon-tile-stack", `${n} cards open with a rounded icon tile above a heading`);

  // ---------- motion ----------
  for (const a of document.getAnimations?.() ?? []) {
    const t = a.effect?.getTiming?.();
    const el = a.effect?.target;
    if (!el || t?.iterations !== Infinity) continue;
    const r = el.getBoundingClientRect();
    const frames = a.effect.getKeyframes?.() ?? [];
    const moves = frames.some((f) => /translate/.test(f.transform ?? ""));
    if (moves && (el.textContent || "").trim().length > 12 && Math.max(r.width, el.parentElement?.getBoundingClientRect().width ?? 0) > vw * 0.5) hit("marquee", `${label(el)} scrolls continuously`);
    else if (r.width <= 16 && r.height <= 16 && frames.some((f) => f.opacity !== undefined || /scale/.test(f.transform ?? ""))) hit("pulsing-dot", `${label(el)}`);
  }
  if (document.querySelector("marquee")) hit("marquee", "<marquee>");

  // ---------- chrome around the words ----------
  for (const el of textEls) {
    if (!/^H[1-2]$/.test(el.tagName)) continue;
    const prev = el.previousElementSibling;
    if (!prev || !visible(prev)) continue;
    const pt = (prev.textContent || "").trim();
    const pcs = cssOf(prev);
    const small = fs(prev) <= Math.max(14.5, fs(el) * 0.45);
    const caps = pcs.textTransform === "uppercase" || (pt.length > 2 && pt === pt.toUpperCase() && /[A-Z]/.test(pt));
    const tracked = (parseFloat(pcs.letterSpacing) || 0) / fs(prev) >= 0.06;
    if (pt.length > 0 && pt.length <= 48 && prev.children.length <= 1 && small && (caps || tracked)) hit("kicker-above-heading", `"${pt.slice(0, 30)}" above ${el.tagName.toLowerCase()}`);
    if (/^0?\d{1,2}\s*[/.—-]?\s*(0?\d{1,2})?$/.test(pt) && pt.length <= 6) hit("numbered-labels", `"${pt}" above ${el.tagName.toLowerCase()}`);
  }
  for (const el of textEls) {
    if (!/^(BUTTON|A|LI|SPAN|DIV|I)$/.test(el.tagName)) continue;
    const t = ownText(el);
    if (t.length <= 4 && /^\p{Extended_Pictographic}+$/u.test(t) && !/^[←-⇿✓✔]/.test(t) && !el.closest("[lang]:not(html)")) hit("glyph-icon", `${t} in ${label(el)}`);
  }

  // ---------- copy ----------
  const main = document.querySelector("main") ?? document.body;
  const copy = (main.innerText || "").replace(/\s+/g, " ");
  // One line per text element, quotes straightened: the patterns anchor on line starts and ends, so they need lines, not one long string.
  const corpus = [...new Set(textEls.filter((el) => main.contains(el)).map(ownText))].join("\n").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  const lower = corpus.toLowerCase().replace(/\n/g, " ");
  if (tells) {
    const residue = (tells.residue ?? []).filter((s) => lower.includes(s));
    if (residue.length) hit("copy-residue", residue.slice(0, 3).join("; "));
    const placeholders = (tells.placeholders ?? []).filter((s) => lower.includes(s));
    if (placeholders.length) hit("copy-placeholder", placeholders.slice(0, 3).join("; "));
    const wordHits = [];
    for (const w of tells.words ?? []) {
      const n = (lower.match(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")) ?? []).length;
      if (n) wordHits.push(n > 1 ? `${w} x${n}` : w);
    }
    if (wordHits.length >= 2 || wordHits.some((x) => /x[3-9]/.test(x))) hit("ai-prose-words", wordHits.slice(0, 6).join(", "));
    const phraseHits = (tells.phrases ?? []).filter((s) => lower.includes(s));
    if (phraseHits.length) hit("ai-prose-phrases", phraseHits.slice(0, 3).join("; "));
    for (const pat of tells.patterns ?? []) {
      let rx;
      try { rx = new RegExp(pat.regex, pat.flags ?? "g"); } catch { continue; }
      const m = corpus.match(rx);
      if (m && m.length) hit(`copy-${pat.id}`, `${pat.note ?? pat.id}: ${String(m[0]).slice(0, 60)}`, undefined, pat.severity === "error" ? "minor" : "review");
    }
  } else {
    const BUZZ = /\b(streamline[sd]?|empower(s|ed|ing)?|supercharge[sd]?|world-class|enterprise-grade|next-generation|cutting-edge|state-of-the-art|game-?chang(er|ing)|revolutioni[sz]e[sd]?|seamless(ly)?|unlock the power|best-in-class|holistic|synerg(y|ies)|leverag(e|es|ing))\b/gi;
    const buzz = [...new Set((copy.match(BUZZ) ?? []).map((w) => w.toLowerCase()))];
    if (buzz.length >= 2) hit("ai-prose-words", buzz.slice(0, 5).join(", "));
  }
  const dashes = (copy.match(/\u2014| -- /g) ?? []).length;
  if (dashes >= 8) hit("em-dash-saturation", `${dashes} em dashes in the main copy`);
  const rebuttals = (copy.match(/\bNot an? [^.]{2,28}\. (A|An|The) [^.]{2,28}\.|(?<=[.!?]) (No|Just|Only) \w+( \w+)?\./g) ?? []).length;
  if (rebuttals >= 3) hit("aphoristic-cadence", `${rebuttals} short rebuttal endings`);

  // ---------- pictures ----------
  for (const img of document.images) {
    const src = (img.currentSrc || img.getAttribute("src") || "").trim();
    const placeholder = !src || /placeholder|via\.placeholder|placehold\.|lorem|example\.com|dummyimage|picsum|unsplash\.it|data:image\/(gif|png);base64,.{0,60}$/i.test(src);
    const broken = img.complete && img.naturalWidth === 0 && !!src && visible(img);
    if (placeholder && visible(img)) hit("broken-image", `img with ${src ? "placeholder source " + src.slice(0, 50) : "no source"}`);
    else if (broken && !/\.svg(\?|$)/.test(src)) hit("broken-image", `img failed to load: ${src.slice(0, 60)}`);
  }

  // ---------- browser surfaces the design did not draw ----------
  const rules = [];
  for (const sheet of document.styleSheets) {
    try {
      const walk = (list) => { for (const r of list) { rules.push(r.cssText); if (r.cssRules) walk(r.cssRules); } };
      walk(sheet.cssRules);
    } catch { /* cross-origin sheet */ }
  }
  const css = rules.join("\n");
  const missing = [];
  if (!/::selection/.test(css)) missing.push("::selection");
  if (!/accent-color/.test(css)) missing.push("accent-color");
  if (!/caret-color/.test(css)) missing.push("caret-color");
  if (!/scrollbar-color|::-webkit-scrollbar/.test(css)) missing.push("scrollbar-color");
  if (!/text-underline-offset/.test(css)) missing.push("text-underline-offset");
  if (!/:focus-visible/.test(css)) missing.push(":focus-visible");
  if (missing.length >= 3) hit("browser-surfaces", `not themed: ${missing.join(", ")}`);

  // ---------- what is painted, measured in viewport-sized steps ----------
  const items = textEls
    .map((el) => {
      const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getClientRects()[0] ?? el.getBoundingClientRect();
      return { el, range, top: r.top + window.scrollY, width: r.width, height: r.height };
    })
    .filter((i) => i.width > 1 && i.height > 1)
    .sort((a, b) => a.top - b.top);
  const done = new Set();
  let hiddenChars = 0, totalChars = 0;
  const hiddenEls = [];
  const opacityOf = (el) => { let o = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) o *= parseFloat(cssOf(e).opacity); return o; };
  const step = Math.max(200, Math.floor(vh * 0.8));
  const height = Math.min(document.documentElement.scrollHeight, 40000);
  // Pages often set scroll-behavior: smooth. Scroll instantly and wait two frames, or hit-testing runs against a half-scrolled page.
  const jump = async (y) => {
    window.scrollTo({ top: y, left: 0, behavior: "instant" });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 90));
  };
  for (let y = 0, guard = 0; y < height && guard < 80; y += step, guard++) {
    await jump(y);
    for (const it of items) {
      if (done.has(it.el)) continue;
      const live = it.range.getClientRects()[0];
      if (!live) continue;
      const top = live.top;
      it.left = live.left;
      it.width = live.width;
      it.height = live.height;
      if (top < 0 || top + it.height > vh || it.left < 0 || it.left + it.width > vw + 1) continue;
      done.add(it.el);
      const el = it.el;
      const cs = cssOf(el);
      const text = ownText(el);
      totalChars += text.length;
      const op = opacityOf(el);
      if (op < 0.05 && !el.closest("[role=tooltip], [data-allow-hidden], .sr-only")) { hiddenChars += text.length; if (hiddenEls.length < 3) hiddenEls.push(snip(el, 20)); continue; }
      const probe = () => {
        const live2 = it.range.getClientRects()[0];
        if (!live2) return null;
        const x = live2.left + Math.min(live2.width, 40) / 2, y = live2.top + live2.height / 2;
        return { x, y, stack: document.elementsFromPoint(x, y) };
      };
      let { x: px, y: py, stack } = probe();
      let at = stack.indexOf(el);
      const covered = (s) => s[0] && s[0] !== el && !el.contains(s[0]) && !s[0].contains(el) && s.indexOf(el) > 0;
      if (covered(stack)) {
        // Reveals and parallax can put something over text for a frame. Report it only if it is still there after a pause.
        await new Promise((r) => setTimeout(r, 300));
        const again = probe();
        if (again && covered(again.stack)) {
          const t = cssOf(again.stack[0]);
          const c = parse(t.backgroundColor);
          if ((c && c[3] >= 0.9) || /^(IMG|VIDEO|CANVAS)$/.test(again.stack[0].tagName)) hit("text-occluded", `${snip(el)} is covered by ${label(again.stack[0])}`);
        }
        ({ x: px, y: py, stack } = again ?? { x: px, y: py, stack });
        at = stack.indexOf(el);
      }
      if (at < 0) continue;
      if (cs.backgroundClip === "text" || cs.webkitBackgroundClip === "text") continue; // gradient-clipped text has no flat colour to measure
      // What is painted behind the text, top to bottom: the element's own ancestors (table rows and row groups are painted but never
      // hit-tested, so the stack alone misses them) plus anything else the hit test finds behind it, such as a positioned panel or picture.
      const order = new Map(stack.map((e, i) => [e, i]));
      const ancestors = [];
      let prev = at;
      for (let e = el; e; e = e.parentElement) {
        const i = order.has(e) ? order.get(e) : prev + 0.5;
        ancestors.push([e, i]);
        prev = i;
      }
      const inChain = new Set(ancestors.map(([e]) => e));
      const behind = [...ancestors, ...stack.slice(at + 1).filter((e) => !inChain.has(e)).map((e) => [e, order.get(e)])].sort((x, y) => x[1] - y[1]);
      let unknown = false;
      const layers = [];
      for (const [e] of behind) {
        const t = cssOf(e);
        if (/^(IMG|VIDEO|CANVAS|PICTURE)$/.test(e.tagName) && e !== el) { unknown = true; break; }
        if (t.backgroundImage && t.backgroundImage !== "none") { unknown = true; break; }
        const c = parse(t.backgroundColor);
        if (c && c[3] > 0) layers.push(c);
        if (c && c[3] >= 0.99) break;
      }
      if (unknown) { if (fs(el) >= 14 && text.length > 3) hit("text-over-image", `${snip(el)}`); continue; }
      let bg = layers.length && layers[layers.length - 1][3] >= 0.99 ? layers.pop() : [255, 255, 255, 1];
      for (const l of layers.reverse()) bg = over(l, bg);
      const fgRaw = parse(cs.color);
      if (!fgRaw) continue;
      const fg = over([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * op], bg);
      const cr = ratio(fg, bg);
      const size = fs(el);
      const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
      const need = large ? 3 : 4.5;
      const disabled = el.closest("[disabled], [aria-disabled='true']");
      if (cr < need && !disabled && text.length > 1) {
        const detail = `${snip(el, 24)} ${cr.toFixed(1)}:1 (${hex(fg)} on ${hex(bg)})`;
        hit(cr < 3 ? "low-contrast" : "low-contrast-aa", detail, cr);
      }
      const f = hsl(fg), b = hsl(bg);
      if (f.s < 0.12 && f.l > 0.15 && f.l < 0.85 && b.s > 0.4 && b.l > 0.15 && b.l < 0.9 && text.length > 3 && cr < 7) hit("gray-on-color", `${snip(el, 24)} grey ${hex(fg)} on ${hex(bg)}`);
    }
  }
  await jump(0);
  if (totalChars > 400 && hiddenChars >= 200 && hiddenChars / totalChars >= 0.15) hit("content-hidden-at-rest", `${Math.round((hiddenChars / totalChars) * 100)}% of the text is invisible: ${hiddenEls.join(", ")}`);

  const numbers = [...new Set(corpus.match(/\d[\d,.:]*\d|\b\d{2,}\b/g) ?? [])].slice(0, 80);
  return { hits, stats: { bodySize, h1, h2, h3, textElements: textEls.length, measured: done.size, numbers } };
}
