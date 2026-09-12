#!/usr/bin/env bash
# publish_gh_pages.sh — build the GitHub Pages mirror and push it to the `gh-pages` branch.
#
#   export GH_TOKEN="..."          # any token with push access to the repo
#   ./publish_gh_pages.sh
#
# What the mirror is: the same static bundle as Cloudflare Pages, but with
#   window.API_BASE  = the Cloudflare Pages origin  (CORS is open on /api + /webhook)
#   window.BASE_PATH = /Istanbul-startup-from-iran  (repo sub-directory)
# so the AI Navigator chat, intake, deck generation and webhook self-checks all
# keep working from https://websites-by-ai.github.io/Istanbul-startup-from-iran/
# while the JSON/deck assets are served locally by GitHub Pages.
#
# The token is read from the environment only and is redacted from all output.
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"
REPO="${GH_REPO:-Websites-by-AI/Istanbul-startup-from-iran}"
OUT="${GH_OUT:-public-gh}"
BRANCH="${GH_BRANCH:-gh-pages}"
: "${GH_TOKEN:?set GH_TOKEN (needs push access to $REPO)}"
mkdir -p .tmp
redact() { sed -e 's#x-access-token:[^@]*@#x-access-token:<REDACTED>@#g' -e 's/ghp_[A-Za-z0-9]*/<REDACTED>/g' -e 's/github_pat_[A-Za-z0-9_]*/<REDACTED>/g'; }

echo "→ building the GitHub Pages mirror"
python3 build_static.py --target gh-pages --out "$OUT" >/dev/null
echo "  $(find "$OUT" -type f | wc -l) files in $OUT/"

echo "→ creating the $BRANCH commit (working tree untouched)"
INDEX="$ROOT/.tmp/ghpages.index"
rm -f "$INDEX"
( cd "$OUT" && GIT_DIR="$ROOT/.git" GIT_WORK_TREE="$ROOT/$OUT" GIT_INDEX_FILE="$INDEX" git add -A . )
TREE=$(GIT_INDEX_FILE="$INDEX" git write-tree)
PARENT=$(git rev-parse -q --verify "origin/$BRANCH" 2>/dev/null || true)
MSG="chore($BRANCH): static mirror built from main@$(git rev-parse --short HEAD 2>/dev/null || echo local)"
GIT_ID=(-c user.name="${GH_PAGES_NAME:-Websites-by-AI}" -c user.email="${GH_PAGES_EMAIL:-websites-by-ai@users.noreply.github.com}")
if [ -n "$PARENT" ]; then
  COMMIT=$(GIT_INDEX_FILE="$INDEX" git "${GIT_ID[@]}" commit-tree "$TREE" -p "$PARENT" -m "$MSG")
else
  COMMIT=$(GIT_INDEX_FILE="$INDEX" git "${GIT_ID[@]}" commit-tree "$TREE" -m "$MSG")
fi
rm -f "$INDEX"

echo "→ pushing $BRANCH"
git push "https://x-access-token:$GH_TOKEN@github.com/$REPO.git" "$COMMIT:refs/heads/$BRANCH" 2>&1 | redact
git fetch -q origin "$BRANCH" 2>/dev/null || true

echo
echo "✔ done → https://${REPO%%/*}.github.io/${REPO##*/}/"
