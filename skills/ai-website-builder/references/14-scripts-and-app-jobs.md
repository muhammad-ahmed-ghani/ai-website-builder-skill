# Scripts, app jobs, accessibility additions, charts, motion numbers

Five lookup parts. Read the one you need: fonts when the audience reads anything but plain English (with `01` section 3), the jobs table in step 1 and 2 of the loop, the rest while building and in QA.

## 1. Type by writing system

Verified on 2026-10-27: every package below answered `npm view <pkg> name version` (all 5.3.x). Coverage and axes come from the family's published subset and axis list, not from npm. Re-run the check before use; packages move.

Rules for every script:
- Install the package, import it in `fonts.css`, name it in `--font-display|sans|mono`. Never a runtime font link. The default import already declares every subset with `unicode-range`, so the browser fetches only the slices a page uses; open the network list once and confirm no stray large file.
- Put the script face FIRST in the stack and a Latin face second for brand names and numbers, or the reverse for a mostly Latin page. Both must be installed. Compare x-height at one size; if they differ, size the fallback with `size-adjust`.
- Set `lang` (and `dir` for right to left) on `<html>` and on every block in another language. `lang` picks glyph forms for Han, Cyrillic variants and Turkish casing.
- Per script: no negative tracking on body or display, no `text-transform: uppercase` outside Latin, Cyrillic and Greek, no synthetic italic or bold where the face has no such style. The display leading in `03` (0.82 to 0.9) is for Latin only: use 1.1 or more for any script with stacked marks or tall glyphs, and for Vietnamese capitals.
- Test string on a real render at 390 and 1440: a long headline, a paragraph, a number, a mixed Latin name. Empty boxes or a clipped mark fail the page.
- No script here needed a habit face. The Latin faces below are not safe defaults either (Bricolage, Instrument Serif and Atkinson are fashionable or specialised): earn them from the client's world as in `03` section 5.

| Script | Faces (role: package) | Notes |
|---|---|---|
| Latin (`lang` as the language) | display: `@fontsource-variable/bricolage-grotesque` (opsz, wdth, wght 200 to 800); `@fontsource/dela-gothic-one` (one heavy weight); `@fontsource-variable/anybody` (wdth 50 to 150); `@fontsource/gloock` (one weight). text: `@fontsource-variable/newsreader` (opsz 6 to 72); `@fontsource-variable/source-serif-4`; `@fontsource-variable/public-sans`; `@fontsource-variable/hanken-grotesk`; `@fontsource/atkinson-hyperlegible` (400 and 700 only, for legibility briefs). mono: `@fontsource-variable/jetbrains-mono`; `@fontsource/ibm-plex-mono` | Use opsz on serifs (max for display, min for text). Mono only for facts (prices, times, codes) with tabular figures. Two families total, one optional mono |
| Latin extended (Polish, Czech, Turkish, Romanian, Hungarian, Maltese) | same packages: `public-sans`, `source-serif-4`, `newsreader`, `hanken-grotesk`, `gloock` all list `latin-ext` | Set `lang="tr"` for Turkish casing (dotted and dotless i). Check ogonek, caron and comma-below letters in the test string. `schibsted-grotesk` and `figtree` also cover it |
| Cyrillic (`ru`, `uk`, `bg`, `sr`, `kk`) | text: `@fontsource-variable/onest`; `@fontsource-variable/golos-text`; `@fontsource/pt-serif` (400 and 700 with italics); `@fontsource-variable/literata`. display: `@fontsource-variable/unbounded`; `@fontsource/dela-gothic-one`. mono: `@fontsource-variable/jetbrains-mono` | Words run long: keep the measure at 55 to 70 characters and leading 1.5 or more. Cyrillic italics are different letterforms: choose a face that ships a real italic for long text. Bulgarian and Serbian forms appear only with the right `lang` |
| Greek (`el`) | text: `@fontsource-variable/literata`; `@fontsource-variable/source-serif-4`; `@fontsource-variable/commissioner`; `@fontsource-variable/noto-sans`. display: `@fontsource/gfs-didot` (one weight, high contrast, large sizes only); `@fontsource/dela-gothic-one` | Leading 1.5 or more: accents stack. With `lang="el"` uppercase drops the tonos by the language's rule; check it renders, never fake it with letter replacement |
| Arabic and Persian (`ar`, `fa`; `dir="rtl"`) | text sans: `@fontsource/ibm-plex-sans-arabic` (100 to 700 static); `@fontsource-variable/noto-sans-arabic`; Persian-leaning `@fontsource-variable/vazirmatn`. Naskh text: `@fontsource-variable/noto-naskh-arabic`; book feel: `@fontsource/amiri` (with italics for Latin). display: `@fontsource-variable/noto-kufi-arabic` | Never letter-space Arabic script: it breaks the joins. No uppercase, no italic of Arabic letters. Leading 1.7 to 2.0. Digits are a content choice: Arabic-Indic for Arabic readers who expect it, Persian forms for `fa` (4, 5, 6 differ). Put code, numbers in Latin and URLs in `dir="ltr"` or `<bdi>`. Mirror icons that show direction |
| Urdu (`ur`; `dir="rtl"`) | Nastaliq: `@fontsource/noto-nastaliq-urdu` (wght 400 to 700). Naskh alternative: `@fontsource-variable/noto-naskh-arabic` | Nastaliq slopes and is very tall: leading 2.0 to 2.4, padding-block on buttons, inputs and tabs, no fixed heights, no `overflow: hidden` on text boxes, or ascenders and descenders clip. Test string must include the Urdu-only letters (ٹ ڈ ڑ ں ے ۓ); Vazirmatn and some Naskh faces miss or reshape them. Urdu digits are the extended Arabic-Indic set. Smaller than 16 px Nastaliq is unreadable: raise the base size to 18 |
| Hebrew (`he`; `dir="rtl"`) | sans: `@fontsource-variable/heebo`; `@fontsource-variable/assistant`; `@fontsource-variable/noto-sans-hebrew` (wdth, wght). serif: `@fontsource-variable/frank-ruhl-libre`. display: `@fontsource/secular-one` (one weight) | No italics (use weight or colour), no letter-spacing. Leading 1.6. Pointed text (niqqud) needs a face that holds the marks: render a pointed line before choosing. Mixed Latin runs in `<bdi>` |
| Devanagari (`hi`, `mr`, `ne`, `sa`) | sans: `@fontsource-variable/noto-sans-devanagari` (wdth 62.5 to 100); `@fontsource/hind` (300 to 700); `@fontsource/mukta`. serif: `@fontsource/tiro-devanagari-hindi`; `@fontsource-variable/noto-serif-devanagari`. display: `@fontsource/rozha-one` (one heavy weight) | Leading 1.6 to 1.8: the headline bar and the vowel signs above and below need room. No tracking, no condensed width at body size. Letters join into conjuncts: never split a word with `<br>` or `word-break: break-all` |
| Bengali (`bn`) | sans: `@fontsource-variable/noto-sans-bengali`; `@fontsource/hind-siliguri`; `@fontsource-variable/anek-bangla` (wdth 75 to 125). serif: `@fontsource-variable/noto-serif-bengali` | Leading 1.7 or more. Body 17 px or more: the glyphs are detailed and small sizes close up. No tracking, no italic |
| Tamil (`ta`) | sans: `@fontsource-variable/noto-sans-tamil`; `@fontsource/hind-madurai`; `@fontsource-variable/anek-tamil`. serif: `@fontsource-variable/noto-serif-tamil` | Wide glyphs and long words: widen the measure to 45 to 60 characters, check narrow cards and buttons at 390 for overflow. Leading 1.7 to 1.9. No tracking, no italic |
| Thai (`th`) | sans: `@fontsource-variable/noto-sans-thai`; `@fontsource/sarabun`; `@fontsource/ibm-plex-sans-thai`. serif: `@fontsource-variable/noto-serif-thai`. display: `@fontsource/kanit` | No spaces between words: leave `word-break: normal` so the browser breaks at word boundaries, do not justify, no hyphenation. Leading 1.7 to 1.9 (tone marks stack). Test a line with tone marks over vowels. No italic |
| Japanese (`ja`) | sans: `@fontsource-variable/noto-sans-jp`; `@fontsource/zen-kaku-gothic-new`. serif: `@fontsource/shippori-mincho`. display: `@fontsource/dela-gothic-one` (heavy, also has Latin, Cyrillic, Greek, Vietnamese) | `lang="ja"` is required or Chinese glyph forms may show. Leading 1.8 to 2.0; display 1.2 or more. `line-break: strict`; `word-break: auto-phrase` as a progressive extra. No italic, no uppercase. Full-width punctuation is correct. Load few weights: CJK files are large; the packages slice by `unicode-range` |
| Korean (`ko`) | sans: `@fontsource-variable/noto-sans-kr`. serif: `@fontsource-variable/noto-serif-kr`; `@fontsource/gowun-batang`. display: `@fontsource/black-han-sans` (one heavy weight) | `word-break: keep-all` so words are not cut mid-syllable block. Leading 1.7 to 1.9. No italic, no tracking |
| Chinese, Simplified (`zh-Hans`, `zh-CN`) | sans: `@fontsource-variable/noto-sans-sc`. serif: `@fontsource-variable/noto-serif-sc`. display: `@fontsource/ma-shan-zheng` (brush, a few words only); `@fontsource/zcool-xiaowei` (one weight) | `lang` must say Simplified. Leading 1.8 to 2.0, display 1.2 or more. Bold in a variable CJK face is heavy: prefer 500 and 700 over 400 and 900. No italic. Body 16 px or more |
| Chinese, Traditional (`zh-Hant`, `zh-TW`, `zh-HK`) | sans: `@fontsource-variable/noto-sans-tc`. serif: `@fontsource-variable/noto-serif-tc`. soft text: `@fontsource/lxgw-wenkai-tc` (three weights, reads like a printed handwriting hand; good for a calm reading app) | Same rules as Simplified. `zh-HK` and `zh-TW` use different glyph preferences: set the one the audience reads. Do not convert Simplified text by script: translations need a person to check |
| Vietnamese (`vi`) | text: `@fontsource/be-vietnam-pro` (static; the variable name does not exist); `@fontsource-variable/newsreader`; `@fontsource-variable/public-sans`. display: `@fontsource-variable/bricolage-grotesque` | Diacritics stack on top and bottom: leading 1.5 or more in text, 1.1 or more in capitals and heroes. Test a line with the tallest marks (ệ, ẫ, Ữ). Make sure the `vietnamese` slice loads |

Re-verify in one line: `for p in $(grep -o '@fontsource[-a-z0-9/]*' 14-scripts-and-app-jobs.md | sort -u); do npm view $p name version; done`.

## 2. What people come for

Before research, write each app's three to five real jobs in this shape. The first screen must let someone start the first job; the trap is what models do instead. Honesty rules from `01` apply to every row: a missing fact is left out, never invented.

Read apps (about a business, person, place or thing):

| App | Jobs a visitor arrives to do | First-screen consequence | Typical trap |
|---|---|---|---|
| Restaurant or cafe | read the menu, check hours and place, book or order | menu link or the menu itself, open-now computed from real hours | menu as an unreadable image; hours guessed |
| Bakery or food maker | see what is made, know when and how to collect | products with prices the owner gave, collection route | a cart that cannot take payment |
| Salon, barber, spa | see services and prices, pick a time, see the work | services with prices, one real booking route | booking form that goes nowhere |
| Clinic or dental practice | learn if they treat me, how to book, where, what to do urgently | booking route, address, emergency note only if supplied | invented clinician bios, outcome claims |
| Law, accounting, advice | judge competence, learn what they handle, make first contact | practice areas in plain words, how a first call works | invented case results, win counts |
| Trades and local services | confirm they cover my area, call quickly, see what they do | call link and areas served beside the headline | invented 24 hour or reply promises, licence numbers |
| Real estate or rentals | browse listings, filter, enquire about one | listings with price and real photos | stock interiors posing as listings |
| Gym, studio, class | see the timetable, price and a first step | the timetable with true times | invented member or class counts |
| School, tutor, academy | see what is taught, level, schedule, fees, how to enrol | courses and one enrol step | invented pass rates, teacher credentials |
| Nonprofit or cause | understand the work, give, volunteer | what it does and the owner's real way to give | invented impact numbers, an unwired donate form |
| Faith or community group | find times, place, events, contact | times and address first | invented attendance or news |
| Museum, gallery, venue | opening hours, tickets, what is on now | hours and the current programme | a ticket button with no ticket system |
| Event or conference | date, place, schedule, speakers, register | date and place in the first line, register route | invented speakers, sponsors, a countdown to a made-up date |
| Wedding or private event | date, place, schedule, reply | the details people need that day | RSVP form that does not send |
| Portfolio (person or studio) | see the work, judge taste, get in touch | the work itself, large | an about-me before any work; invented clients |
| Store front | browse, compare, buy | products with price and the real checkout route | stock photos, fake stock levels, urgency timers |
| Product page for existing software | what is it, who for, how it works, cost, start | the real screen shown working | invented user counts, logo walls |
| Documentation or help | find the answer, copy code, check version | search first, version visible, copy buttons | a marketing hero in front of the docs |
| News, magazine, blog | read, find more, subscribe | lead story at a good measure | fake "trending" or read counts |
| Newsletter or author | judge the writing, subscribe | one real sample and a sign-up that sends | invented subscriber counts |
| Government or civic service | do the task, check eligibility and deadlines | the task start in plain language | decorative hero, motion, jargon |
| Open-source project | install, read docs, see changes | a copyable install line, docs link | invented download or star counts |

Use apps (people work inside them; `05` applies):

| App | Jobs | First-screen consequence | Typical trap |
|---|---|---|---|
| Dashboard or analytics | see what changed, drill in, export | key numbers with period, change control, last updated | charts with no axes, invented live feeds |
| Chat or messaging | read new, reply, find old | thread list beside the composer, unread state | fake presence and typing |
| Notes or writing | capture fast, find later | an empty editor ready to type, search | a tour before the first note |
| Tasks or project board | see what is mine, move it, assign | my work view, not an empty board | drag as the only way to move |
| Calendar, scheduling, booking tool | find free time, book, reschedule | week view with free slots and the time zone | ignoring time zones, no cancel path |
| CRM or contacts | find a person, log a touch, see what is next | search and the pipeline | real-looking names with no "Demo data" label |
| Inventory or orders | see what is low, receive, adjust | low-stock list first, adjust inline | no history of changes |
| Invoices, expenses, budget | add an entry, categorise, see totals | add control and this month's total | gain and loss told by colour alone |
| Habit, health or mood tracker | log in two taps, see the trend | today's log, trend one tap away | invented streaks, medical advice |
| Language learning (`01`, `05`) | do the next lesson, practise, see progress | a designed home with the next lesson and progress | a school brochure for an invented school |
| Flashcards or exam practice | drill, see weak spots, resume | start a session, count of due items | a timer or score that does nothing |
| Course platform | resume, browse, get proof of completion | resume card first | a certificate nobody issues |
| Marketplace or directory | search, filter, compare, contact | search with filters and real results | invented listing counts, fake reviews |
| Portal or back office | sign in, do the task, see status | sign-in with visible demo credentials (`05`), then the task | a login that accepts anything |
| AI tool (image, text, voice) | enter input, watch progress, get and save the result | input and result area, limits shown | a provider key in the browser, no refusal or credit states |
| Media player | find, play, queue | player and library, controls by keyboard | autoplay with sound |

## 3. Accessibility additions

Each line is a test. Add the flows to `.app-notes/flows.json` and the measurements to `check-app.mjs` where noted.

- Focus not obscured: tab through every control at 390 and 1440; the focused element's box is never fully covered by a fixed or sticky element. Set `scroll-padding-top` to the real height of the sticky bar (the starter's `5rem` is a default; a two-line mobile bar is taller). Measurable: compare each focused rect with fixed elements.
- Target size: floor 24 by 24 CSS px, or a 24 px circle around the target that touches no other target. Below 24 fails; 24 to 43 warns; our goal for touch stays 44 (`04`).
- Drag alternatives: every drag (reorder, resize, board move, slider on a canvas) has buttons or arrow keys that do the same; test the flow with the keyboard only.
- Accessible sign-in: the password field accepts paste, has `autocomplete` values (`username`, `current-password`), and no step asks for a puzzle, transcription or memory test. Demo credentials stay visible and copyable.
- Error summary: after a failed submit with two or more errors, focus moves to a summary heading at the top whose items link to each invalid field; inline errors stay linked with `aria-describedby`. With one error, focus that field.
- Carousel and ticker: anything that advances alone has a visible pause control and previous and next; it stops on focus, hover, off-screen and reduced motion. The Ticker in the starter is covered.
- Consistent help: the contact or help link sits in the same place and order on every route (extend the DOM consistency check in `06`).
- No redundant re-entry: within one flow a value already given (email, address, name) is prefilled or selectable; the only repeat allowed is a confirmation that is essential.

## 4. Chart chooser

Pick by the question, then check the limit. Over a limit, change the form, do not shrink the marks. Dashboards only; a chart that shows invented data is a `01` violation.

| Question | Use | Limit, then change |
|---|---|---|
| How did it change over time | line | at least 4 points (fewer: a number card), at most 6 lines (more: small multiples) |
| Compare categories | bar | under 20 vertical; 20 to 50 horizontal; over 50 a sortable table |
| Part of a whole | stacked bar to 100 percent; donut only as a second choice | donut at most 6 slices |
| Two measures related | scatter | under about 500 points as vector; more: canvas at reduced opacity; over about 5,000: bin |
| Progress against a target | bullet bars | one gauge only for a single metric; 3 or more: a grid of bullets |
| Many measures on a few items | grouped bars | radar only with 2 to 3 items and 5 to 8 axes |
| Steps that lose people | funnel or ordered bars | 3 to 8 stages, group small ones |
| Running total of changes | waterfall | 4 to 12 bars |
| Intensity by two categories | heat grid | label cells or give a scale; aggregate past about 10,000 cells |

Text fallback, every chart: a visible table or one sentence of the finding beside it; hover values reachable by keyboard focus; series told apart by dash, marker shape or a direct label, never hue alone. Time series over about 1,000 points are downsampled before drawing. `check-app.mjs` should count charts without a table or summary as a major.

## 5. Motion numbers and text probes

Motion (`04` has the recipes; these are the limits):
- Stagger: at most 8 children and at most 100 ms between them; past 8, reveal the group as one.
- Pin: at most 2 pinned or scrubbed sections on a page.
- Loaders: show nothing for the first 300 ms of a wait; once shown, keep it at least 400 ms so it does not flash. A skeleton for waits over 1 s.
- Exit about 60 to 70 percent of the entrance; a page transition exit stays under 250 ms and never waits on a fetch without a maximum wait.
- Set the final state directly; never depend on `animationend` for correctness; a repeat trigger cancels the earlier motion.
- Never parallax body copy; no overshoot easing on tables or dense data; a fade never rests between opacity 0 and 0.2.

Text probes (run at 320 and 390):
- Long token: paste a 60 character unbroken string (an address, an id) into each text container; no horizontal scroll. Fix with `overflow-wrap: anywhere` and `min-width: 0` on flex or grid text children.
- Never `word-break: break-all` on prose (Korean uses `keep-all`, CJK uses `line-break`, see part 1).
- Headings: `text-wrap: balance` as a progressive extra; no hard line breaks or blanket non-breaking spaces to shape a headline.
- Essential meaning is never line-clamped to make cards equal; truncated labels have a visible full path.
- A status pill is plain text unless it acts; if it acts it is a real button with pressed state. A changing count is announced as a phrase ("3 items in the basket"), not a bare number.

Not adopted from other guidance: testimonial, review or logo sections the owner did not supply; urgency colours, countdowns and scarcity prompts; named trend styles chosen from a list; any runtime font link.
