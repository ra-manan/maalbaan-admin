# Maalbaan Admin (manage.maalbaan.com)

The vendor panel for Maalbaan staff: the accounts that buy a licence or a monthly subscription, their status, payments and demo requests. Built from the approved vendor admin design (`design-kit/Admin.dc.html`, screenshots 20 and 21) with the Maalban design tokens (`src/design/`).

It never shows a dealer's invoices or customers: the API behind it does not hold them.

## Screens

| Screen | What it does |
|---|---|
| Dashboard | Active, expiring, read-only and suspended accounts; monthly recurring revenue; payments and new accounts per month; computers connected; new demo requests; renewals due in 30 days; accounts by plan; recent activity |
| Accounts | All accounts with filters (All, Active, Suspended, Expiring, Read-only, Trial) and search; **New account** |
| Account detail | Licence and plan, contact, payments, connected computers. Edit details, **Record payment** (optionally extends the licence date), **Activation code** (shown once, WhatsApp link), **Suspend / Reactivate**, remove a computer |
| Demo requests | Requests from the website form. Set status, add notes, **Create trial account** (14 days) |
| Plans and prices | Owner sets monthly and yearly prices (empty until decided); they feed MRR |
| Staff (owner) | Add people, set a new password, pause a login |
| Activity log | Who did what |

Suspending an account reaches the desktop app through the signed licence (the app locks on its next check, no grace days). Plan, billing and notes are for your team; the app only reads the end date, grace days and the paused flag.

## Run it locally

```bash
# 1. the API (Maalbaan Project/server). First time only: create server/.dev.vars with
#    ADMIN_TOKEN=<any text>, LICENSE_PRIVATE_KEY=<private key from `npm run keys`>, ADMIN_ORIGINS=http://localhost:5173
cd ../"Maalbaan Project"/server
npm run migrate:local
npm run dev                      # http://localhost:8787

# 2. make the first owner login (once)
curl -X POST http://localhost:8787/v1/admin/staff -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" -d '{"email":"you@maalbaan.com","name":"Your Name","password":"a long password"}'

# 3. the panel
cd "../../Maalbaan Admin"
npm install
npm run dev                      # http://localhost:5173 (Vite proxies /v1 to the API)
```

Checks: `npm run typecheck`, `npm test`, `npm run build`.

## Deploy

1. **API** (Maalbaan Project/server): `npm run migrate` (applies `0003_admin_panel.sql` to the real database), then `npm run deploy`. `ADMIN_ORIGINS` is already `https://manage.maalbaan.com` in `wrangler.toml`. The API must be reachable at `https://api.maalbaan.com`.
2. **First owner**: run the curl above against `https://api.maalbaan.com` with the real `ADMIN_TOKEN`. Then use Staff in the panel to add everyone else.
3. **Panel**: `npm run deploy` (builds, then publishes `dist` as the Cloudflare Worker `maalbaan-admin`). In Cloudflare, open Workers, `maalbaan-admin`, Settings, Domains and Routes, and add the custom domain `manage.maalbaan.com`.
4. **Website**: rebuild and deploy it. `Maalbaan website/.env.production` already points the demo form at `https://api.maalbaan.com/v1/demo-requests`.

The sign-in cookie is `HttpOnly`, `Secure` and `SameSite=Strict`, set by `api.maalbaan.com` and sent from `manage.maalbaan.com` (same site). Writes are accepted only with an `Origin` of the panel. A login pauses for 15 minutes after 5 wrong passwords; a session lasts 12 hours.

## Not built (needs the app to report it)

- Users per account ("4 / 5" in the design) and app version ("On latest version"): the desktop app does not send these yet, so the panel shows computers connected and last seen instead.
- Support desk, Releases: not requested.
