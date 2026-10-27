# Contributing

1. Branch off `main`: `fix/short-slug` for repairs, `feature/short-slug` for additions.
2. Edit the skill under `skills/ai-website-builder/`.
3. Run the checks: `python3 tools/check_skill.py`. If you touched `scripts/check-app.mjs` or `scripts/lib/`, also run `node tools/tests/design-scan.test.mjs` from a folder that has `playwright-core` installed (set `CHROME_PATH` to a local Chrome if Playwright has none). A new scan rule needs a line in the sloppy fixture and in the test's list.
4. If you changed the starter, prove it still builds: `bash skills/ai-website-builder/scripts/scaffold.sh /tmp/demo-app --app`.
5. Rebuild the archive: `python3 tools/package_skill.py`, and commit `dist/ai-website-builder.skill` with your change.
6. Add a line to `CHANGELOG.md`. Bump `metadata.version` in `SKILL.md` for user-visible changes.

## Skill rules

- `SKILL.md` addresses the agent. Keep it short and move detail into `references/`, one level deep.
- The `description` frontmatter is the trigger: say what the skill does and when to use it, in at most 1024 characters, with no angle brackets.
- Say "app" in the skill's own wording. The person's own words stay verbatim when quoted.
- Never commit a key, a token, a password or a personal path. `tools/check_skill.py` fails the build on the common shapes.
- A scan rule needs a fix sentence in `RULES`, a row in the table in `09-design-craft.md`, and a fixture that trips it. Prefer a measured rule with one right answer; make judgement calls `review`.
- Scripts stay free of install-time surprises: the QA script needs Playwright and the optimiser needs `sharp`, and each says so in its header.
- Every rule added to a reference should come from a failure that was seen. Put the failure in `references/07-failure-catalogue.md`.
