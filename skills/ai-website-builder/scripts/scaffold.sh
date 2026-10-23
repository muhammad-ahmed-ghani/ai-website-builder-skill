#!/usr/bin/env bash
# Copy the starter template into a new project, install, and prove it builds.
#   bash scaffold.sh ./my-app                    copy, pnpm install, lint, build
#   bash scaffold.sh ./my-app --app              also put accounts.ts, db.ts and seed.ts in src/app/ (a working product)
#   bash scaffold.sh ./my-app --no-install       copy only (flags can be combined)
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:?usage: scaffold.sh <target-dir> [--app] [--no-install]}"
shift
NO_INSTALL=""
APP=""
for flag in "$@"; do
  case "$flag" in
    --no-install) NO_INSTALL="--no-install" ;;
    --app) APP="--app" ;;
    *) echo "Unknown flag $flag" >&2; exit 1 ;;
  esac
done

if [ -e "$TARGET" ] && [ -n "$(ls -A "$TARGET" 2>/dev/null)" ]; then
  echo "Refusing to copy into $TARGET: it is not empty." >&2
  exit 1
fi

mkdir -p "$TARGET"
cp -R "$SKILL_DIR/assets/template/." "$TARGET/"
if [ "$APP" = "--app" ]; then
  mkdir -p "$TARGET/src/app"
  cp "$SKILL_DIR/assets/app-starter/accounts.ts" "$SKILL_DIR/assets/app-starter/db.ts" "$SKILL_DIR/assets/app-starter/seed.ts" "$TARGET/src/app/"
  echo "  - src/app/{accounts,db,seed}.ts written: rename the key in accounts.ts, write seed.ts, and see references/05-working-apps.md"
fi

NAME="$(basename "$(cd "$TARGET" && pwd)" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-')"
if command -v node >/dev/null 2>&1; then
  node -e "
    const fs=require('fs');const p='$TARGET/package.json';
    const j=JSON.parse(fs.readFileSync(p,'utf8'));j.name='${NAME:-app}';
    fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');"
fi

echo "Copied the starter to $TARGET"
echo "  - working notes go in $TARGET/.app-notes/  (see .app-notes/README.md)"

if [ "$NO_INSTALL" = "--no-install" ]; then
  echo "Skipped install. Next: cd $TARGET && pnpm install && pnpm lint && pnpm build"
  exit 0
fi

command -v pnpm >/dev/null 2>&1 || { echo "pnpm is not installed (npm i -g pnpm). Then: cd $TARGET && pnpm install" >&2; exit 1; }
cd "$TARGET"
pnpm install
pnpm lint
pnpm build
echo "The starter installs, lints and builds. Start with .app-notes/brief.json, then tokens."
