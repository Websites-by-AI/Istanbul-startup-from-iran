#!/usr/bin/env bash
# domain-check.sh — status of the custom domain and what is still missing.
#
#   CLOUDFLARE_API_TOKEN=... ./domain-check.sh
#
# The Pages custom domain `startup.exhibition2world.ir` is registered, but
# Cloudflare can only finish activation once the CNAME record exists in the
# exhibition2world.ir zone. Creating a DNS record needs the **DNS:Edit**
# permission, which the current token does not have — see DOMAIN.md.
set -euo pipefail
cd "$(dirname "$0")"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-5b456a2b43bb367410c50b35b9e7f71f}"
API=https://api.cloudflare.com/client/v4
PROJECT=istanbul-startup-from-iran
DOMAIN=startup.exhibition2world.ir
ZONE=987f865c17cc927696478e4176b083c7
H=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json")

python3 - "$API" "$PROJECT" "$DOMAIN" "$ZONE" <<'PY'
import json, os, sys, urllib.request
api, project, domain, zone = sys.argv[1:5]
tok = os.environ["CLOUDFLARE_API_TOKEN"]
acc = os.environ["CLOUDFLARE_ACCOUNT_ID"]

def get(path):
    req = urllib.request.Request(api + path, headers={"Authorization": "Bearer " + tok})
    return json.loads(urllib.request.urlopen(req, timeout=30).read().decode())

def post(path, body):
    req = urllib.request.Request(api + path, data=json.dumps(body).encode(), method="POST",
        headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=30).read().decode())

rec = get(f"/zones/{zone}/dns_records?name={domain}")["result"]
print(f"DNS record {domain}: " + (f"{rec[0]['type']} -> {rec[0]['content']}" if rec else "MISSING"))

st = get(f"/accounts/{acc}/pages/projects/{project}/domains")["result"]
for d in st:
    if d["name"] == domain:
        print(f"Pages domain status: {d.get('status')}")
        v = d.get("verification_data") or {}
        if v.get("error_message"):
            print(f"  note: {v['error_message']}")

if rec and any(d["name"] == domain and d.get("status") == "active" for d in st):
    print(f"OK -> https://{domain} is live")
    sys.exit(0)

if not rec:
    print("\nThe token cannot write DNS. Two ways to finish:")
    print("  A) Cloudflare dashboard -> exhibition2world.ir -> DNS -> Add record")
    print("       Type: CNAME   Name: startup   Target: istanbul-startup-from-iran.pages.dev")
    print("       Proxy status: Proxied (orange cloud)   TTL: Auto")
    print("  B) Give the API token the 'DNS -> Edit' permission for exhibition2world.ir,")
    print("     then re-run this script — it will create the record automatically.")
    try:
        r = post(f"/zones/{zone}/dns_records", {"type": "CNAME", "name": "startup",
                 "content": "istanbul-startup-from-iran.pages.dev", "proxied": True, "ttl": 1,
                 "comment": "Startup Landing Platform (Cloudflare Pages)"})
        print("  auto-created:", r["success"], r.get("errors"))
    except Exception as exc:  # noqa: BLE001
        print("  auto-create failed:", exc)
sys.exit(0 if rec else 1)
PY
