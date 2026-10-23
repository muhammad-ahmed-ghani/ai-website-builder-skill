# Failure catalogue: what went wrong in real builds, and the cure

Each entry happened. Read the ones near your task before you start, and check your finished work against the whole list before you report.

## Reading the request

| Symptom | Cause | Cure |
|---|---|---|
| "A website for language learning" became a school brochure: Home, Courses, Contact, an enquiry form, an invented school | The word "website" decided the shape; the brief said "not an app; lessons happen outside the app" | The activity-app rule: an activity plus an audience and no owner is a product people use. Build lessons, practice and progress. See `01` and `05` |
| A Slack-like request was built as a landing page with a fake login | The request said "app" but the builder defaulted to marketing | A product's `/` is the working screen; demo backend; demo accounts with the credentials visible on the sign-in screen |
| "Why did it ask again, always with the same two options, and never use my answer?" | Generic clarification, answers not recorded | One grouped question, meaningful options and a recommended default; every answer goes into the requirements ledger and is read by every later step |
| A follow-up lost the earlier context, or was refused with "start a new project" | The follow-up router treated "build the whole app" as a new app | Keep the project: brief, plan, ledgers, design. Expansion is not a restart |
| A steer or answer given mid-run never reached the app | It was shown to one agent only | Append to the ledger at once and notify every agent that is running; later steps re-read the ledger |
| A login screen with no credentials, or one that accepts anything | The agent invented a form and left the accounts out | Demo accounts written once, shown on the screen, checked on sign-in |

## Design

| Symptom | Cause | Cure |
|---|---|---|
| Four concepts that all look the same ("Copybook Margin", "Copybook Tutor", "Lesson Timetable", "Sabaq Copybook") | The inspiration step was skipped for products, so concepts were written from text alone | Pictures for every kind of app, including products: boards of the product's own screens. Concepts descend from boards, with disjoint strategies and layout families |
| The four pictures were four different apps | A grid used as a menu of directions | A board is ONE design shown as four screens; diversity lives between boards |
| Every app opens with Inter, a gradient and three icon cards | Model habit | The refusal lists in `03`; the thesis forecasts the slop; the panel's prosecutor lists tells before praise |
| Timid type | Safe defaults | Monumental display type for confident brands (`fat-display-statement`) |
| Great inspiration, weaker proof, worse build ("a tear-down") | Fidelity decayed at each hop because the picture was only extra text | The chosen board is the target at every stage; panel 1 for the home, panels 2 to 4 for their pages; the plate hero; a final side-by-side check |
| A board cut through the middle of a panel | Panels assumed to sit on exact halves | Measure the gutters in pixels (10 to 26 px, rows 53/47 seen) |
| A working app with no home and no sections when the person wanted a real introduction | Over-correcting "no marketing" for every product | Learning apps get a real home with sections; other working apps open on the work |
| A proof that drew a bowl in CSS and a hero that was missing | The writer faked a picture | Proofs are judged as renders; a missing hero or an SVG object is rejected before scoring |
| A hero photograph with a flaw baked in (a pen on the notebook spine) that three repair rounds could not remove | CSS cannot edit a picture; the repairer had no image tool | Regenerate the picture with a corrected prompt, or recompose around the flaw; if you cannot, report "needs a new picture" |
| A page of text blocks with one hero image | Rationing images | Plan about one art-directed picture per screen of scrolling; one shared style sentence |

## Build

| Symptom | Cause | Cure |
|---|---|---|
| React error 418 (hydration mismatch) on every page but the first | `vite preview` answered `/route` with the HOME markup (single-page fallback); the browser hydrated the wrong page | Redirect `/route` to `/route/` (the starter's config does); treat any remaining mismatch from this cause as an artefact |
| A form that could not reach its endpoint during QA | The sandbox's egress policy refused it | Allow-list the form endpoint for the test; mark it an artefact; list the form as NOT VERIFIED rather than clean |
| `hello@yourdomain.com`, a `.example` address, a made-up phone number | Filling a gap | Only destinations the client gave; otherwise a visible Draft or leave it out |
| Testimonials, logo walls, "10,000+ customers" | Filling a gap | Omit, or build an honest alternative (how it works, the process, a sample) |
| A button that goes nowhere, `href="#"`, a disabled "not connected yet" | A feature faked | Wire it for real or leave it out and say so |
| Raw hex colours and palette classes silently producing nothing | The palette is removed, only tokens exist | Tokens only; lint fails the build |
| A malformed structured answer from a model lost a whole concept (a list sent as a string, tool markup leaking into a field) | Brittle parsing | Repair before validating: decode lists sent as strings, strip leaked markup, drop only the element that cannot be saved; one concept is asked per call; keep a fallback concept so a slot is never empty |
| A 30-minute serial build | One writer for every page | Foundation first, then page builders in parallel with disjoint write scopes, then an integrator |

## QA and reporting

| Symptom | Cause | Cure |
|---|---|---|
| "Finished" with the plan still loading and critique errors unresolved | The run ended without settling the list and the verdict was inflated | Settle every to-do item at every ending; `partial` while anything is open or unverified; list what is open in plain words |
| A repair that made things worse | No comparison after the change | Re-run the same gates on affected pages; roll back when worse, no change, or as many new problems as fixed |
| A regression introduced by a fix | Fixes were not re-checked | One more regression pass after repairs |
| A model's gentle opinion hid a real console error | Opinion overruled measurement | Measured blockers cannot be lowered by an opinion |
| "I looked and it is fine" without a picture | Code read instead of screenshot | Evidence beats code; never describe a page you did not look at |
| The final summary certified what was never measured | Written from intent | Assemble the closing report from measurements only |
| The agent said "Sure, generating it right now" and called no tool, so nothing happened | A lead agent with no working tools of its own talked itself out of delegating | Never say work has started unless the call that starts it was made. A guard that re-asks once or twice when a reply claims work but has no tool call; the lead hands work to a subagent |
