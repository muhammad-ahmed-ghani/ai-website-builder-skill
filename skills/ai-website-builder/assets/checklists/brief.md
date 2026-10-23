# The brief and the ledgers

Write these as files in `.app-notes/` at the start and keep them current. Every later step reads them.

## `.app-notes/brief.json`

Example for one request (do not copy the content, copy the shape):

```json
{
  "name": "Sabaq",
  "summary": "A free, browser-based way for people in Pakistan to learn English with Urdu beside every line.",
  "audience": "Beginner to intermediate adults and students in Pakistan who read Urdu and want practical English",
  "appType": "app",
  "language": "en",
  "dir": "ltr",
  "alsoWrittenIn": [{ "language": "ur", "dir": "rtl", "script": "Nastaliq or Naskh web font, real Urdu text" }],
  "app": {
    "kind": "learning",
    "product": "Short English lessons with Urdu translations, practice checked on the spot, progress kept in the browser",
    "painPoint": "Courses start from nothing the learner already knows and explain in a language they do not read well",
    "needsAccounts": false,
    "roles": [],
    "entities": ["lessons", "phrases", "practice questions", "progress"],
    "wantsLanding": false
  },
  "pages": [
    { "route": "/", "title": "Home", "purpose": "A designed introduction with one way into the first lesson" },
    { "route": "/lessons", "title": "Lessons", "purpose": "The path: what is done and what is next" },
    { "route": "/lesson", "title": "Lesson", "purpose": "English beside Urdu, tap to reveal, tap to hear" },
    { "route": "/practice", "title": "Practice", "purpose": "A few questions checked on the spot" },
    { "route": "/progress", "title": "Progress", "purpose": "What the learner has done, kept in the browser" }
  ],
  "facts": [
    { "text": "It is for people in Pakistan", "source": "client", "span": "for pakistani specific people" }
  ],
  "unknowns": [
    { "kind": "other", "topic": "Which language is taught (assumed English for Urdu speakers)" },
    { "kind": "policy", "topic": "Whether any part costs money" }
  ],
  "assumptions": [
    "The request names no language to learn, so the first course teaches English to Urdu speakers; the owner can change it.",
    "No accounts: progress is kept in the browser and the app says it is free to start.",
    "The name Sabaq (Urdu for lesson) is a working name I chose; the owner can change it."
  ]
}
```

`text` is the person's own words (trimmed, not paraphrased). Rules: `facts` only from the person's own words (the exact `span`); everything else is an assumption or an unknown. `appType` is `pages` (a reading app: people read it and act from it) or `app` (a working app: people use it). A working app has the `app` block; a reading app leaves it out. A product has the `app` block; an app leaves it out.

## `.app-notes/requirements.json`

```json
{
  "items": [
    { "id": "R1", "text": "Create a website for language learning for pakistani specific people.", "source": "prompt", "status": "built", "servedBy": ["/", "/lesson", "/practice"] },
    { "id": "R2", "text": "Show the credentials on the login", "source": "follow-up", "status": "not-done", "note": "There is no login: nobody signs in" }
  ]
}
```

`source`: prompt, follow-up, steer, answer, reference. `status`: open, designed, built, verified, not-done, superseded. Add a line the moment the person says something; never delete one.

## The claims ledger in one rule

A sentence that says what the business does, offers, includes, charges, promises, allows or how fast it replies must trace to a `fact`. If it does not, leave it out, turn it into an invitation, or (only when the page cannot work without it) place one `<Draft id label>` marker the owner must resolve.
