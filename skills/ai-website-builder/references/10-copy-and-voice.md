# Copy and voice

Every string a person reads is copy: headlines, buttons, labels, errors, empty states, alt text, FAQ answers, meta descriptions. Copy that could sit on any other app unchanged is the default a model writes for every reader. Copy that is specific to one reader and one app comes only from the owner's facts. The claims ledger in `01-read-the-request.md` decides what may be said; this file decides how to say it and how to check it.

Language: copy follows the person's language. The word lists in section 4 are English. For any other language apply the structural rules (section 3 and the structural categories 3, 4, 5, 6, 11 and 12 in section 4) only and judge by ear; do not translate the lists.

## 1. Voice from facts: the method

1. **Gather the voice sample.** From `.app-notes/brief.json` take the owner's own words (`facts[].span`) and anything they supplied (about text, menus, messages, a page). Pick 8 to 12 phrases they actually use, how they name their things, how long their sentences run, whether they say "we" or "I". Write them in `.app-notes/voice-sample.md`. No sample (an activity app, a thin brief): derive the voice from the audience and category (`02-research-and-strategy.md` question 7) and say in the notes that it is derived.
2. **Write the voice card** in DESIGN.md's voice section: 3 traits, each with a do and a don't; person (we, you, neither); sentence length range; the owner's words to reuse; 8 to 10 words and structures THIS app refuses (the shared lists plus whatever the thesis slop forecast predicts); punctuation (sentence case, no dashes).
3. **Build the copy map before writing**: `.app-notes/copy-map.json`, one row per slot.
   ```json
   { "slots": [ { "page": "/", "section": "hero", "slot": "headline", "job": "say what the visitor gets",
                  "facts": ["f3"], "text": "..." } ] }
   ```
   Slot kinds: headline, subhead, button, link, label, helper, placeholder, empty, error, success, alt, faq-answer, meta. `facts` lists ids from `brief.json`. A slot with no fact is omitted, turned into an invitation, or is the one `<Draft>`. Numbers, times and prices are copied exactly.
4. **Apply the slot rules** (section 2).
5. **Draft, then scan.** Run the scripted tell scan (section 5) and fix every error; read each warning and decide.
6. **Reader test** (section 6) on every section.
7. **Specificity floor and the no-additions re-check.** Each section holds at least one concrete noun, number, place or constraint from the facts. If it holds none, shorten it or remove it. Then diff the final copy against the copy map: no number, name, claim, guarantee, motive or feeling appeared that no fact supports.

Builders read the voice card and their own rows of the copy map; the integrator runs the scan over the whole app.

## 2. Slot rules

| Slot | Rule | Not this |
|---|---|---|
| Headline | The outcome in the visitor's words, one idea, passes the five-second test. If it fits a competitor unchanged, rewrite | A mission statement, a pun with no content |
| Subhead | Adds a fact the headline lacks; never restates it | The headline again in longer words |
| Button, link | Verb plus what the person gets ("Book a table", "See the menu"). Say where a link goes | "Submit", "Learn more", "Get started", "Click here" |
| Form label | A noun the person would say, always visible; the hint says the format or why we ask, once | A label that exists only as a placeholder |
| Placeholder | An example value in the real format | An instruction ("Enter your name") |
| Error | What happened, the cause only if known, what to do next; the field's own message beside the field; no blame, no jokes | "Oops", "Something went wrong", "Invalid input" |
| Empty state | What will live here and the one action that fills it; in a demo app, say it is demo data | "No data available", "Nothing to see here" |
| Success | The new state of things and the next step ("Message sent. We will reply to the email you gave."); a reply time only if the owner gave one | "Success!", celebration, an invented reply time |
| Loading, progress | What is happening, in the person's terms; time only if measured | A fake percentage |
| Confirmation (delete, leave) | Name the thing and the consequence; the buttons name the actions | "Are you sure?" with Yes and No |
| Alt text | The image's job in the page; "Illustrative image" for a generated picture | A caption claiming a real event, keyword lists |
| 404, offline | Say what is missing and offer the way back or home | A joke in place of a route |

## 3. Voice rules that need no list

- Sentence case everywhere. Plain verbs: "is", "has", "uses", not "serves as", "boasts", "features".
- One idea per paragraph. Vary sentence length; short only when it carries a new fact.
- No chat voice: no greeting, praise, offer or sign-off inside the app's copy.
- Names and numbers beat adjectives. A superlative needs a source in the brief or goes.
- Write for the person who is here now. Do not re-explain what the screen already shows.

## 4. Tell categories, strongest first

Act on one sighting of 1 to 5. Categories 6 to 12 are weak alone: act when two or more land in the same section, or when one is plainly wrong for the fact. A tell counts in proportion to how rarely a careful writer would choose it on purpose.

| # | Category | The tell | The fix |
|---|---|---|---|
| 1 | Chat residue | "Certainly!", "Great question", "I hope this helps", "let me know if", offers to continue | Delete the wrapper, keep the content |
| 2 | Invented proof | "Trusted by", "award-winning", "10,000+ customers", "join thousands", ratings, rankings, "100% satisfaction" | Cut it, or use the exact fact from the brief with its source |
| 3 | Negate-then-assert | "It's not just X, it's Y", "not only X but Y", "more than just", "this doesn't mean X, it means Y", a clipped tail such as "no guessing" | State Y plainly. Keep the contrast only if the reader really believes X |
| 4 | Staged closers and fragments | A one-line paragraph repeating the one above; "That's the real win"; "Let that sink in"; rows of verbless fragments; a sentence that explains an example just shown | Cut it, or merge into one sentence with a claim |
| 5 | Depth sayings and run-ups | "At its core", "what really matters", "X is the language of Y", "Let's dive in", "Here's the thing", "To be clear" | Replace with the specific claim, start at the point |
| 6 | Forced triads | Three adjectives, three one-word sentences ("Fast. Simple. Powerful."), three feature cards because threes feel complete | Check each item adds an idea; merge, or lead with the strongest |
| 7 | Inflation | "Pivotal", "a testament to", "plays a key role", "the future looks bright", mission and heritage blocks for ordinary facts | Keep the fact, drop the significance. End on the last concrete fact |
| 8 | Sales voice and weightless words | Seamless, unlock, elevate, empower, revolutionize, cutting-edge, game-changer, world-class, breathtaking, "in today's fast-paced world", "look no further" | Say what the person can now do |
| 9 | Hedging and vague links | "Could potentially", "associated with", "in connection with" | One hedge only if a fact needs it; name the real relationship or leave it out |
| 10 | Dash habit and decoration | Em dashes and spaced dashes as the universal connector; emoji or sparkles as bullets; Title Case headings; "!!" | Period, comma, colon, parentheses; sentence case |
| 11 | Repetition by rule | Same sentence opening in a row; the same closer under every section; a heading restated by its first line; headline restated by the subhead | Merge, vary, or cut the repeat |
| 12 | Guessing | "Details are limited", "not publicly available", then a "likely" filler; an about text written with no facts | Say what the owner has not told us, in a Draft or omit; never fill with a guess |

Do not fix a flagged word by swapping a synonym. The cure is to rewrite the line from a fact. A swap only breeds the next tell.

## 5. What a script checks and what needs judgement

`scripts/lib/copy-tells.json` is read by the lint (`lint.ts`, on string literals and JSX text) and by `scripts/check-app.mjs` (on the rendered text of the production build, which also catches copy from data files). Text is lowercased and curly quotes are straightened before the lists match. The scan applies to visible copy only, never to code or comments. Lists are English; for another language rely on judgement.

| File section | Holds | Result |
|---|---|---|
| `residue` | chat phrases that leaked into copy | fail |
| `placeholders` | lorem, "your name here", sample names, fake addresses | fail |
| `patterns` with `error` | em dashes, spaced dashes, invented proof phrases | fail, unless the brief supplies that exact fact |
| `words`, `phrases` | AI-prose words and stock phrases | warn |
| `patterns` with `warn` | negate-then-assert, run-ups, verbless triads, fragment rows, hedges, question openers, generic labels, emoji, repeated exclamation marks, "elevate" and "leverage" hype | warn |

Also scripted: `check-app.mjs --facts .app-notes/brief.json` lists every number in the rendered main copy that the brief does not contain (`unsourced-number`, a review finding). Trace each to a fact or remove it; structural numbers (a list index) are the only exceptions. Sample people and numbers in a working app that says "Demo data" on screen are exempt from the placeholder and numeral checks.

A warning is a prompt to look, not a verdict. Keep a hit that quotes the owner, names a real thing ("Old Testament"), or is a proper noun. Remove everything else. Fix errors before the build is called done.

Judgement only (the reviewer pass in `06-qa-and-repair.md`, with this file open): inflation in new wording, depth sayings in new wording, whether each triad item adds an idea, fake alternatives ("a tempting approach would be..."), whether a closer adds a fact, whether the copy sounds like the owner, and whether the headline fits a competitor unchanged.

## 6. Soul and the reader test

Removing slop is only half the job. Text with every tell deleted still reads as nobody's. The cure is specificity chosen for one reader. In an app the only legitimate source of specificity is the owner's real facts: their words, numbers, places, constraints and honest limits ("what this is not for"). So:

- Use the owner's phrasing and register where they gave any. A supplied sample outranks the word lists, but never the honesty rules.
- Never invent an anecdote, motive, opinion, reaction, feeling or founder story to add warmth. No "we love", "our passion", "it all started when".
- Thin facts mean shorter copy and fewer sections, never warmer filler.
- A small true detail beats a polished general line.

**Reader test.** For each section, delete one sentence at a time. If the reader loses no fact, no action and no reassurance they needed, it stays deleted. Then read the section aloud next to the voice sample: it should sound like the owner, not like the category.

**Re-check.** After every rewrite, compare with the copy map. A rewrite may drop a line. It may not add a fact, name, number, date, guarantee, price, reply time or claim.

The closing report follows the same rule: lead with the verdict and the one fact the reader lacks; do not rebuild context they have.
