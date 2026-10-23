<h1 align="center">AI Website Builder</h1>

<p align="center">
An <a href="https://agentskills.io">Agent Skill</a> that builds web apps that are designed, honest and verified instead of templated.<br>
It reads what the person really wants, picks the look from pictures before writing code, builds from a token-driven starter,
and checks the result in a real browser.
</p>

<p align="center">
<img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT">
<img src="https://img.shields.io/badge/skill-v1.1.0-informational" alt="skill v1.1.0">
<img src="https://img.shields.io/badge/Agent_Skills-compatible-success" alt="Agent Skills compatible">
</p>

## Use it in one line

Install it (below), then tell your agent:

> use ai-website-builder to build an app for learning Urdu, for people in Pakistan

The agent decides whether the request is an app to **read** (a business, a person, a product) or an app to **use** (a dashboard, a tool,
a learning app), and builds the right one. The word "website" in a request does not decide it. What people will do in it does.

## What it does

- **Reads the request properly.** It writes down what the person said in their own words, what is unknown and what it assumed, and asks at most one grouped
  question, only when a wrong guess would change the build. An activity with an audience and no business named becomes a working app with a designed home,
  not a brochure.
- **Research before design.** The real category, the audience's worries, nine strategy answers and a design thesis.
- **Six directions from pictures.** Each round makes six inspiration boards. A board is one design shown as four screens of the same app. The person can
  ask for more rounds until something is right. Without an image model it renders six rough HTML proofs instead and says so.
- **Concepts, proofs and a binding baseline.** One structurally different concept per board, rendered as a real page, scored, chosen.
  The chosen picture becomes `DESIGN.md`, tokens, fonts and a contrast-checked palette that the build must match.
- **A starter that fails the build on the usual mistakes.** Vite, React 19, TypeScript and Tailwind v4 with per-route prerender, 18 UI primitives,
  a motion kit, an immersive kit and a lint for raw colours, palette classes, missing alt text, oversized images and lorem ipsum.
- **A working-app kit.** Accounts, a local database and seed data, so a product opens on the working screen with demo data and visible demo sign-ins.
- **Honesty rules.** No invented testimonials, logos, ratings, prices, addresses or statistics. Nothing pretends to work. A claim such as "tested" or
  "responsive" needs evidence for that exact claim.
- **Real-browser QA.** `check-app.mjs` loads the production build at three sizes, scrolls like a visitor, measures what it can, runs the feature flows,
  records a tour, and writes a verdict. Looking at the pictures and judging them stays the agent's job.
- **Repair at the cause.** Reproduce, fix the cause with the smallest change, re-check, roll back what made it worse.
- **An honest closing report.** What was built, what is real and what is mocked, what was verified and what was not, what the person must supply.
- **Any language and script.** `lang` and `dir` are set, real script is used, logical CSS properties are preferred, and translations that cannot be
  verified are flagged for the owner.

## Install

The repository is private for now, so use an account that can read it (`gh auth login` once).

### Claude Code, as a plugin

```
/plugin marketplace add muhammad-ahmed-ghani/ai-website-builder-skill
/plugin install ai-website-builder@ai-website-builder-marketplace
```

### Claude Code, as a personal skill

```bash
gh repo clone muhammad-ahmed-ghani/ai-website-builder-skill
mkdir -p ~/.claude/skills && cp -R ai-website-builder-skill/skills/ai-website-builder ~/.claude/skills/
```

### From the packaged archive

`dist/ai-website-builder.skill` is a zip with the skill folder at its root. Unzip it into your skills folder:

```bash
gh repo clone muhammad-ahmed-ghani/ai-website-builder-skill
mkdir -p ~/.claude/skills && unzip -o ai-website-builder-skill/dist/ai-website-builder.skill -d ~/.claude/skills
```

Claude.ai accepts the same `.skill` file as an uploaded custom skill.

### Any other agent

The folder `skills/ai-website-builder/` is self-contained: a `SKILL.md`, `references/`, `scripts/` and `assets/`. Copy it into the folder your agent reads
skills from, or point the agent at `SKILL.md` and tell it to follow the links from there.

## Requirements

The skill itself is plain Markdown. Its scripts need:

| Script | Needs |
|---|---|
| `scripts/scaffold.sh` | Node 22.22 or newer and pnpm 10 |
| `scripts/check-app.mjs` | `playwright` with a browser (`npx playwright install chromium`), or `--chrome /path/to/chrome` |
| `scripts/optimize-images.mjs` | `sharp` (`pnpm add -D sharp`) |
| `scripts/contrast.mjs` | Node only |

## What is in it

```
skills/ai-website-builder/
  SKILL.md                     the method, the non-negotiables, the loop
  references/
    00-operating-loop.md       the steps in order, with artifacts and gates
    01-read-the-request.md     app to read or app to use, and the questions worth asking
    02-research-and-strategy.md
    03-design-direction.md     inspiration boards, rounds, concepts, proofs, the panel
    04-build-system.md         tokens, pages, copy, pictures, the starter's rules
    05-working-apps.md         accounts, demo data, flows, what counts as real
    06-qa-and-repair.md        what to measure, what to look at, how to repair
    07-failure-catalogue.md    failures seen in real builds, and the rule each one taught
    08-role-briefs.md          how to split the work between helpers
  scripts/                     scaffold, contrast, image optimiser, browser QA
  assets/
    template/                  the starter (Vite, React 19, Tailwind v4)
    app-starter/               accounts, database and seed data for working apps
    checklists/                brief and done checklists
```

## Develop

```bash
python3 tools/check_skill.py        # paths resolve, scripts parse, no credentials or personal paths
python3 tools/package_skill.py      # rebuild dist/ai-website-builder.skill
python3 tools/package_skill.py --check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CHANGELOG.md](CHANGELOG.md). Released under the [MIT License](LICENSE).
