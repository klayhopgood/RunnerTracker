# RunnerTracker

Live GPS tracking on a styled world map. Runners connect their phone, go live,
and share location publicly or behind a password.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind)
- **Supabase** — Postgres, Auth, Realtime
- **MapLibre GL JS** + **MapTiler** tiles
- **SendGrid** — auth email via Supabase custom SMTP

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

## Supabase setup

1. Create project at [supabase.com](https://supabase.com).
2. **Settings → API** — copy Project URL, publishable (anon) key, secret (service role) key into `.env.local`.
3. **SQL Editor** — run `supabase/migrations/0001_init.sql`.
4. **Authentication → Providers** — enable Email, disable confirm email until SendGrid is wired (or enable once SMTP works).
5. **Authentication → SMTP Settings** — enable custom SMTP:

   | Field    | Value                |
   | -------- | -------------------- |
   | Host     | `smtp.sendgrid.net`  |
   | Port     | `587` (or `465`)     |
   | Username | `apikey`             |
   | Password | Your SendGrid API key |

6. **Authentication → URL Configuration** — set Site URL to your production URL; add `http://localhost:3000` for local dev.

## MapTiler

1. [cloud.maptiler.com](https://cloud.maptiler.com) → API Keys → Create.
2. Name: `runtracker` (or similar).
3. **Allowed HTTP Origins** — MapTiler wants **domains only, no `http://`**:
   - `localhost` (local dev)
   - `your-app.vercel.app` (Vercel preview/production)
   - Or leave **empty** to allow all origins while testing
4. Copy key → `NEXT_PUBLIC_MAPTILER_KEY` in `.env.local` and Vercel.

## Elevation correction

Server-side DEM lookup: **Mapbox Tilequery** primary, **Open-Elevation** fallback, in-memory cache.

1. [account.mapbox.com](https://account.mapbox.com/access-tokens/) → create a token.
2. Add `MAPBOX_ACCESS_TOKEN` to Vercel (server-only, no `NEXT_PUBLIC_` prefix).
3. Optional: `OPEN_ELEVATION_URL` (defaults to the public Open-Elevation API).

Test after deploy:

```bash
curl "https://your-app.vercel.app/api/elevation?lat=-33.8688&lng=151.2093"
```

## Vercel

1. Import [klayhopgood/RunnerTracker](https://github.com/klayhopgood/RunnerTracker).
2. Add env vars from `.env.example`.
3. Deploy — `main` → production.

## Build phases

See `FOR-AGENT.md` in the Outbid workspace (or project spec) for the full roadmap.

- **Phase 1**: scaffold, auth, static map, elevation API
- **Phase 2**: device pairing, sessions, GPS ingest, Realtime
- **Phase 3**: Capacitor, private viewer
- **Phase 4**: scale, polish, app store prep
