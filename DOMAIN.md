# Custom domain: startup.exhibition2world.ir

**Live now:** https://istanbul-startup-from-iran.pages.dev (full runtime) and
https://websites-by-ai.github.io/Istanbul-startup-from-iran/ (GitHub Pages mirror)
**Custom domain:** `startup.exhibition2world.ir` — registered on the Pages project, waiting for one DNS record.

## Status (checked 2026-09-12)

| Step | State |
| --- | --- |
| Pages project `istanbul-startup-from-iran` | ✅ deployed, production branch `main` |
| Custom domain added to the project | ✅ `startup.exhibition2world.ir` (status `pending`) |
| CNAME record in the `exhibition2world.ir` zone | ❌ **missing — needs DNS:Edit** |
| TLS certificate (Google CA) | ⏳ issued automatically once the CNAME exists |

Cloudflare reports exactly this: `"CNAME record not set"`.

Both API tokens provided so far were tested and **neither can write DNS**:

| Token | Zones | DNS records | Pages deploy |
|---|---|---|---|
| `cfat_jnNM…` | read ✅ | read ✅ / write ❌ `403 Authentication error` | ✅ |
| `cfat_URPZ…` | read ✅ | read ❌ / write ❌ `403 Authentication error` | ✅ |

So the record has to be added by you (option A below) or by a token that has `Zone · DNS · Edit`
(option B). Nothing else is blocking the domain — both live hosts already work without it.

## Finish it — option A (30 seconds, in the dashboard)

Cloudflare dashboard → **exhibition2world.ir** → **DNS** → **Records** → **Add record**:

| Field | Value |
| --- | --- |
| Type | `CNAME` |
| Name | `startup` |
| Target | `istanbul-startup-from-iran.pages.dev` |
| Proxy status | **Proxied** (orange cloud) |
| TTL | Auto |

Save. Cloudflare issues the certificate within a few minutes and
https://startup.exhibition2world.ir starts serving the same build. Verify with:

```bash
./domain-check.sh          # needs CLOUDFLARE_API_TOKEN in the environment
```

## Finish it — option B (give the token DNS:Edit, then run one command)

1. dashboard → **My Profile** → **API Tokens** → edit the token →
   add permission **Zone · DNS · Edit** for zone `exhibition2world.ir` → save.
2. then either re-run `./domain-check.sh` (it creates the record itself), or:

```bash
export CLOUDFLARE_API_TOKEN=...   # token with DNS:Edit
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/987f865c17cc927696478e4176b083c7/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  --data '{"type":"CNAME","name":"startup","content":"istanbul-startup-from-iran.pages.dev","proxied":true,"ttl":1}'
```

Re-registering the domain on the project is **not** needed — it is already there. If it were ever
removed: `POST /accounts/5b456a2b43bb367410c50b35b9e7f71f/pages/projects/istanbul-startup-from-iran/domains`
with `{"name":"startup.exhibition2world.ir"}`.

## Useful IDs

| Item | Value |
| --- | --- |
| Account | `5b456a2b43bb367410c50b35b9e7f71f` (Elasa2next@gmail.com's Account) |
| Zone `exhibition2world.ir` | `987f865c17cc927696478e4176b083c7` |
| Pages project | `istanbul-startup-from-iran` |
| Custom domain id | `1e6ac259-3b8d-442f-adac-4c995037ebc5` |

> Security: never paste tokens into files or chats that get committed. `deploy.sh` and
> `domain-check.sh` read `CLOUDFLARE_API_TOKEN` from the environment only, and both are safe to run
> and to commit.
