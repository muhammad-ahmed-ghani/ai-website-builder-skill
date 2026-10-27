#!/usr/bin/env python3
"""Static checks for the skill folder. Stdlib only.

  1. Every `references/...`, `scripts/...` and `assets/...` path the docs mention exists.
  2. Every script parses (node --check, bash -n) when node and bash are on the PATH.
  3. Nothing that looks like a credential, a private key or a personal path is committed.
  4. Every reference file is listed in SKILL.md, and the shared copy-tells file is valid, compiles in Node and is identical in both places it ships.
  5. The skill's own wording: "app" not "site", and none of this project's old product names.

Usage: python3 tools/check_skill.py [skill-dir]
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "skills" / "ai-website-builder"

PATH_RE = re.compile(r"(?<![\w./-])((?:references|scripts|assets)/[\w./-]*[\w])")
SECRETS = [
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "private key"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AWS access key id"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"), "GitHub token"),
    (re.compile(r"\bsk-[A-Za-z0-9_-]{24,}\b"), "API secret key"),
    (re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}\b"), "Slack token"),
    (re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"), "Google API key"),
    (re.compile(r"/Users/[A-Za-z0-9._-]+/"), "personal path"),
]
TEXT_SUFFIXES = {".md", ".mjs", ".js", ".ts", ".tsx", ".css", ".json", ".yaml", ".yml", ".sh", ".html", ".txt", ".example", ""}
problems: list[str] = []


def files() -> list[Path]:
    return sorted(p for p in SKILL.rglob("*") if p.is_file() and "node_modules" not in p.parts and p.name != ".DS_Store")


def check_paths() -> None:
    for md in [p for p in files() if p.suffix == ".md"]:
        text = md.read_text(encoding="utf-8")
        for m in PATH_RE.finditer(text):
            rel = m.group(1).rstrip(".")
            if any(ch in rel for ch in "*<>{}"):
                continue
            if not (SKILL / rel).exists() and not (md.parent / rel).exists():
                problems.append(f"{md.relative_to(SKILL)}: mentions {rel}, which does not exist")


def check_syntax() -> None:
    node, bash = shutil.which("node"), shutil.which("bash")
    for f in files():
        if f.parts[len(SKILL.parts)] != "scripts":
            continue
        if f.suffix == ".mjs" and node:
            r = subprocess.run([node, "--check", str(f)], capture_output=True, text=True)
        elif f.suffix == ".sh" and bash:
            r = subprocess.run([bash, "-n", str(f)], capture_output=True, text=True)
        else:
            continue
        if r.returncode:
            problems.append(f"{f.relative_to(SKILL)}: does not parse: {r.stderr.strip()[:200]}")


def check_secrets() -> None:
    for f in files():
        if f.suffix not in TEXT_SUFFIXES:
            continue
        try:
            text = f.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for rx, label in SECRETS:
            m = rx.search(text)
            if m:
                problems.append(f"{f.relative_to(SKILL)}: looks like a {label}: {m.group(0)[:12]}...")


def check_references_listed() -> None:
    skill_md = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    for ref in sorted((SKILL / "references").glob("*.md")):
        if f"references/{ref.name}" not in skill_md:
            problems.append(f"SKILL.md does not list references/{ref.name} in its reference map")


def check_tells() -> None:
    lib = SKILL / "scripts" / "lib" / "copy-tells.json"
    tpl = SKILL / "assets" / "template" / "scripts" / "copy-tells.json"
    if not lib.exists() and not tpl.exists():
        return
    if not lib.exists() or not tpl.exists() or lib.read_bytes() != tpl.read_bytes():
        problems.append("copy-tells.json must exist and be identical in scripts/lib/ and assets/template/scripts/")
        return
    try:
        data = json.loads(lib.read_text(encoding="utf-8"))
    except ValueError as e:
        problems.append(f"copy-tells.json is not valid JSON: {e}")
        return
    for key in ("residue", "placeholders", "words", "phrases", "patterns"):
        if not isinstance(data.get(key), list) or not data[key]:
            problems.append(f"copy-tells.json: '{key}' must be a non-empty list")
    node = shutil.which("node")
    if node and not problems:
        script = "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));for(const p of d.patterns){try{new RegExp(p.regex,p.flags||'g')}catch(e){console.log(p.id+': '+e.message);process.exit(1)}}"
        r = subprocess.run([node, "-e", script, str(lib)], capture_output=True, text=True)
        if r.returncode:
            problems.append(f"copy-tells.json has a pattern that does not compile: {r.stdout.strip()[:160]}")


SITE_OK = re.compile(r"og:site_name|twitter:site|siteinspire", re.I)
OLD_NAMES = re.compile(r"imagineart|chatly|everask", re.I)


def check_wording() -> None:
    for f in files():
        if f.suffix not in TEXT_SUFFIXES or f.name == "pnpm-lock.yaml":
            continue
        try:
            lines = f.read_text(encoding="utf-8").splitlines()
        except UnicodeDecodeError:
            continue
        for n, line in enumerate(lines, 1):
            if re.search(r"\bsites?\b", line, re.I) and not SITE_OK.search(line):
                problems.append(f"{f.relative_to(SKILL)}:{n}: says site; this skill says app")
            if OLD_NAMES.search(line):
                problems.append(f"{f.relative_to(SKILL)}:{n}: carries a product name it must not")


if __name__ == "__main__":
    check_paths()
    check_syntax()
    check_secrets()
    check_references_listed()
    check_tells()
    check_wording()
    if problems:
        print("\n".join(problems))
        sys.exit(f"{len(problems)} problem(s)")
    print(f"{len(files())} files checked: paths resolve, references listed, scripts parse, copy tells valid, wording clean, no credentials or personal paths")
