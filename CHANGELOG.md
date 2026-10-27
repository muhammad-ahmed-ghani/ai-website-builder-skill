# Changelog

All notable changes to this skill. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2.0] - 2026-10-27

### Added
- `references/09-design-craft.md`: visitor modes, building a world from the audience's culture with a rut test, colour strategy and light or dark by use scene, type and motion floors, the tells as rules, eleven scoped refinement passes, two isolated assessments, heuristic scoring and persona walks.
- A design scan, `scripts/lib/design-scan.mjs`, run by `check-app.mjs` at every size. It measures rendered contrast, hierarchy, measure, leading, covered and never-revealed text, wrapping buttons, the first screen, keyboard focus, nested cards, side stripes, glows, bounce easing, marquees, default faces, a cream ground and generated-prose copy. Findings are major, minor or review; review items never count against the verdict. New flags `--extremes`, `--facts`, `--no-design`, and flow steps `mark` and `assert_request` so a "sent" message must have a request behind it.
- `references/10` to `15`: copy and voice, listening to the audience, diagrams, reference teardown, fonts per writing system and what visitors come for, redesign and extension. `references/NOTICE.md` credits the public projects that shaped them.
- The starter's lint gains error and warning tiers, waivers (`lint-ok: <rule> <reason>`), motion, focus, viewport, emoji, fake-send and copy rules, a self-test (`scripts/lint.test.ts`) and base styles for text wrapping, accent colour, caret, scrollbar and underline offset.
- `tools/tests/design-scan.test.mjs` with a sloppy, a clean and a below-the-fold fixture, and CI jobs for it and for the lint self-test. `tools/check_skill.py` also checks that every reference is listed, the copy-tells file is valid and identical in both places, and the skill's wording.

### Fixed
- Found and fixed while testing the scan on real generated pages: table row backgrounds are painted but not hit-testable, smooth scrolling made hit tests run against a half-scrolled page, and a reveal frame can look like a covered caption. The scan now builds the painted stack from ancestors plus the hit test, scrolls instantly and confirms an overlap after a pause.

### Added in the README
- A pipeline picture (`assets/pipeline.jpg`), generated with GPT Image 2.5 Sunburst.

## [1.1.0] - 2026-10-23

### Added
- First published release. The skill covers the whole method: reading the request, research and strategy, six-direction inspiration boards,
  concepts and proofs, a binding design baseline, a token-driven build, honest copy, real-browser QA and an evidence-based closing report.
- A starter template (Vite, React 19, TypeScript, Tailwind v4, per-route prerender, a lint that fails the build on the usual mistakes) and an
  app starter with accounts, a local database and seed data for working apps.
- `scripts/check-app.mjs` (measured facts, feature flows, recorded tour), `scripts/contrast.mjs`, `scripts/optimize-images.mjs`, `scripts/scaffold.sh`.
- Packaging and checks for this repository: `tools/package_skill.py`, `tools/check_skill.py`, CI, and a Claude Code plugin marketplace file.
