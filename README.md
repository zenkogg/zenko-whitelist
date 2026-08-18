# Zenko Whitelist

Pre-launch email collection app for Zenko closed beta.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3
- **Database:** Vercel Postgres
- **Deployment:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client and apply migrations against your DATABASE_URL
npm run db:generate
npm run db:migrate:deploy

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

Copy `.env.example` to `.env` and fill in the required values before running the app.

## Sign-in providers

The waitlist supports four OAuth providers: Google, Twitch, X (Twitter), and Virtualeagues.

**Virtualeagues** uses OAuth 2 + PKCE (confidential client). To enable it locally:

1. Set `VL_CLIENT_ID`, `VL_CLIENT_SECRET`, and `VL_REDIRECT_URI` in `.env` (see `.env.example`).
2. Register your redirect URI in the VL OAuth app's allowed list — the match is exact (scheme, host, port, path). Add both your dev URL (`http://localhost:3000/auth/virtualeagues/callback`) and any deployed environments.

Each developer needs their own dev redirect URI registered, or shares a credential whose allowed list already includes `localhost:3000`.

## Loops lifecycle email

Waitlist members are synced to [Loops](https://loops.so) as contacts, and status
transitions fire Loops events that drive the lifecycle emails (welcome, approved,
invitation, referral). The app is the sole writer of the `waitlist*` contact
properties; the zenko-mono backend writes the `zenko*` ones onto the same
email-keyed contact.

- **Runtime path** — every row mutation schedules a fire-and-forget
  `after(() => syncWaitlistUser(...))` (see `lib/loops/`). It never blocks or
  breaks a request: with `LOOPS_API_KEY` unset it is a silent no-op, and a caught
  failure is recorded in `waitlist_users.loops_sync_error` for a later re-sync.
- **Setup (once per workspace)** — create the custom properties before anything
  syncs: `LOOPS_API_KEY=... npx tsx scripts/loops-bootstrap.ts`. Use a *separate*
  key per environment — a wrong-key write emails a real person.
- **Per-environment mailing lists (launch step)** — `LOOPS_MAILING_LIST_ID` is a
  per-deployment env var: local/staging point at the "Dev/Stg" list, and
  **production must set its own separate list id** (in the backend's terraform
  `loops_mailing_list_id` var and the whitelist's Vercel prod env). Contacts are
  added to their deployment's list on `waitlist_joined` / `zenko_registered`, so a
  production campaign sent to the prod list can never reach a staging contact.
  Every contact also carries an `environment` property (`staging` | `production`)
  as a backup filter — gate real sends on `environment is production`. One list
  per environment is enough; do **not** split by whitelist-vs-app — target
  waitlisters vs registered players by `waitlistStatus` / `zenkoRegisteredAt`
  instead. (Contacts land on one shared list; unsubscribe is therefore all-or-
  nothing per environment — revisit topic-lists only if you need finer opt-out.)
- **Local dev** — set `LOOPS_DRY_RUN=1` to log payloads instead of sending.
- **Backfill** — `scripts/loops-backfill.sql` emits a CSV to import via Loops'
  Audience → Import (upserts by email; leave "Trigger workflows" off). The same
  query, filtered to `loops_sync_error IS NOT NULL`, re-exports rows to heal after
  an outage.
- **Tests** — `npm test` (vitest) covers the pure mappers, the client's
  no-op/retry behaviour, and the sync orchestration with an injected client.

## Features
- Email collection form
- Game selection (League of Legends, Valorant, Overwatch 2)
- Responsive design
- PostgreSQL database integration (coming soon)
- Admin dashboard for approvals (coming soon)

## Deployment
Automatically deploys to Vercel on push to `main` branch.

# CI probe: throwaway line, this PR is never merged.
