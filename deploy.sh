#!/usr/bin/env bash
# Build + test + deploy the site to Cloudflare Pages.
#
#   export CLOUDFLARE_API_TOKEN="..."     # needs Pages:Edit
#   export CLOUDFLARE_ACCOUNT_ID="5b456a2b43bb367410c50b35b9e7f71f"
#   export GH_TOKEN="..."           # optional → also publishes the GitHub Pages mirror
#   ./deploy.sh
#
# The token is read from the environment only — it is never written to a file.
set -euo pipefail
cd "$(dirname "$0")"

PROJECT="${PROJECT:-istanbul-startup-from-iran}"
BRANCH="${BRANCH:-main}"

: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:=5b456a2b43bb367410c50b35b9e7f71f}"
export CLOUDFLARE_ACCOUNT_ID

echo "→ rebuilding static bundle"
python3 build_static.py

echo "→ python test suite"
python3 -m pytest -q

if command -v node >/dev/null 2>&1; then
  echo "→ JS core parity check"
  node scripts/parity_check.mjs
fi

echo "→ deploying to Cloudflare Pages ($PROJECT / $BRANCH)"
if [ -x node_modules/.bin/wrangler ]; then WRANGLER=node_modules/.bin/wrangler; else WRANGLER="npx --yes wrangler"; fi
$WRANGLER pages deploy public --project-name "$PROJECT" --branch "$BRANCH" --commit-dirty=true

echo "✔ Cloudflare Pages → https://${PROJECT}.pages.dev"

if [ -n "${GH_TOKEN:-}" ] && [ "${PUBLISH_GH_PAGES:-1}" = "1" ]; then
  echo "→ publishing the GitHub Pages mirror (gh-pages)"
  ./publish_gh_pages.sh
else
  echo "· GitHub Pages mirror skipped (set GH_TOKEN to publish it too)"
fi

echo
echo "✔ done"
