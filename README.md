# Zenko Whitelist

Zenko's waitlist: players sign in, collect referral XP and climb a leaderboard,
and are handed over to zenko.gg once Zenko itself is open.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Database:** Neon Postgres (its own project, separate from the main app's)
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
`DATABASE_URL` and `DATABASE_URL_UNPOOLED` must be your own database, not a
deployed one: they are what Prisma resolves for every local read and write.

Applying migrations is the explicit `db:migrate:deploy` above. `npm run build`
does that step only inside a Vercel build (`scripts/build-migrate.mjs`), so
building locally cannot alter a schema, whatever your `.env` happens to hold.

## Sign-in providers

The waitlist supports four OAuth providers: Google, Twitch, X (Twitter), and Virtualeagues.

**Virtualeagues** uses OAuth 2 + PKCE (confidential client). To enable it locally:

1. Set `VL_CLIENT_ID`, `VL_CLIENT_SECRET`, and `VL_REDIRECT_URI` in `.env` (see `.env.example`).
2. Register your redirect URI in the VL OAuth app's allowed list. The match is exact (scheme, host, port, path). Add both your dev URL (`http://localhost:3000/auth/virtualeagues/callback`) and any deployed environments.

Each developer needs their own dev redirect URI registered, or shares a credential whose allowed list already includes `localhost:3000`.

## Loops lifecycle email

Waitlist members are synced to [Loops](https://loops.so) as contacts, and status
transitions fire Loops events that drive the lifecycle emails (welcome, approved,
invitation, referral). The app is the sole writer of the `waitlist*` contact
properties; the zenko-mono backend writes the `zenko*` ones onto the same
email-keyed contact.

- **Runtime path**: every row mutation schedules a fire-and-forget
  `after(() => syncWaitlistUser(...))` (see `lib/loops/`). It never blocks or
  breaks a request: with `LOOPS_API_KEY` unset it is a silent no-op, and a caught
  failure is recorded in `waitlist_users.loops_sync_error` for a later re-sync.
- **Setup (once per workspace)**: create the custom properties before anything
  syncs: `LOOPS_API_KEY=... npx tsx scripts/loops-bootstrap.ts`. Use a *separate*
  key per environment, because a wrong-key write emails a real person.
- **Per-environment mailing lists (launch step)**: `LOOPS_MAILING_LIST_ID` is a
  per-deployment env var: local/staging point at the "Dev/Stg" list, and
  **production must set its own separate list id** (in the backend's terraform
  `loops_mailing_list_id` var and the whitelist's Vercel prod env). Contacts are
  added to their deployment's list on `waitlist_joined` / `zenko_registered`, so a
  production campaign sent to the prod list can never reach a staging contact.
  Every contact also carries an `environment` property (`staging` | `production`)
  as a backup filter; gate real sends on `environment is production`. One list
  per environment is enough; do **not** split by whitelist-vs-app, target
  waitlisters vs registered players by `waitlistStatus` / `zenkoRegisteredAt`
  instead. (Contacts land on one shared list; unsubscribe is therefore all-or-
  nothing per environment; revisit topic-lists only if you need finer opt-out.)
- **Local dev**: set `LOOPS_DRY_RUN=1` to log payloads instead of sending.
- **Backfill**: `scripts/loops-backfill.sql` emits a CSV to import via Loops'
  Audience → Import (upserts by email; leave "Trigger workflows" off). The same
  query, filtered to `loops_sync_error IS NOT NULL`, re-exports rows to heal after
  an outage.
- **Tests**: `npm test` (vitest) covers the pure mappers, the client's
  no-op/retry behaviour, and the sync orchestration with an injected client.

## Features
- OAuth sign-in (Google, Twitch, X; Virtualeagues behind a flag)
- Referral codes and reputation XP, which carry over to Zenko at sign-up through the backend's waitlist match
- Game interest picks and a leaderboard
- Admin dashboard for approvals
- Copy that follows the main site's closed-beta gate (`lib/zenko-open.ts`)

## Deployment
Automatically deploys to Vercel on push to `main` branch.

## Sunset

The waitlist stays live until Zenko is public, then it is frozen, its data is
archived into Zenko, and its database is dropped (zenkogg/zenko#694, #695).
Run the steps in this order; each one depends on the one before it.

**Before launch, any time**

1. **Link the accounts that missed their match.** On the main DB replica, list
   them with query A below. Set `WAITLIST_ALLOW_UNLINKED_REMATCH=true` on the
   backend, run the admin re-match (`POST /api/admin/waitlist/re-match`) until
   it reports no more candidates, then unset the flag. Query A should now be
   empty; record any row it still returns, with the reason, on #695.
2. **Nudge unclaimed points.** Query B lists linked players whose waitlist XP
   has not been granted yet; point them at the claim card on zenko.gg/referrals.

**Launch day**

3. **Zenko goes public first** (closed-beta admin gate off).
4. **Freeze the waitlist.** Set `WAITLIST_STATUS=closed` on the production
   Vercel deployment and redeploy. `GET /api/waitlist/stats` should report
   `"waitlistStatus": "closed"`. Sign-ups, code use and profile edits are now
   refused; the internal routes the backend calls stay open. Check the backend
   runs `REFERRAL_ENTRY_MODE=portal` (the default): in `waitlist` mode it can
   still create waitlist rows through `ensure-referral-owner`.
5. **Final snapshot.** Export, then import straight away: the importer refuses
   a snapshot older than the last one the backend's live sync imported, so if
   it says the snapshot is older, export again.
   ```bash
   # here, against the production waitlist DB
   node scripts/export-referral-migration.mjs /absolute/private/snapshot.json
   # in packages/backend, against the main DB: dry run, then apply
   npx tsx scripts/import-waitlist-referrals.ts --file /absolute/private/snapshot.json
   npx tsx scripts/import-waitlist-referrals.ts --file /absolute/private/snapshot.json \
     --apply --sha256 <sha256 printed by the export> --source-frozen
   ```
6. **Verify the archive.** Query C on the main DB and query D on the waitlist
   DB must agree on rows, XP and the fingerprint, and C must show `frozen = t`.
7. **Export contacts.** `npx tsx scripts/export-waitlist-contacts.ts` with no
   flags prints the counts. Then, with the legacy-row decision recorded on #694:
   ```bash
   npx tsx scripts/export-waitlist-contacts.ts --legacy <keep|drop> --csv /absolute/private/contacts.csv
   LOOPS_API_KEY=<production key> npx tsx scripts/export-waitlist-contacts.ts \
     --legacy <keep|drop> --apply --environment production
   ```
   Every waitlist row lands exactly once: emailed rows as Loops contacts, rows
   with no email or a shared email in the CSV, which goes to the vault. The
   apply run must report `"failed": []`.
8. **Switch to the archive.** Set `WAITLIST_ARCHIVE_ENABLED=true` on the
   backend. Waitlist history on zenko.gg/referrals is now served from the main
   DB, so it keeps rendering with the waitlist DB unreachable.
9. **Retire the waitlist DB** only after steps 6 to 8 check out.

```sql
-- A (main DB): accounts matching a waitlist identity that were never linked
SELECT u.id AS user_id, a.id AS waitlist_user_id, a.record->>'status' AS waitlist_status,
       (a.record->>'reputationPoints')::int AS waitlist_xp
FROM waitlist_referral_archive a
JOIN oauth_identities o ON o.provider = a.provider AND o.provider_sub = a.provider_sub
JOIN users u ON u.id = o.user_id
WHERE a.active AND u.waitlist_user_id IS NULL;

-- B (main DB): linked accounts with waitlist XP not granted yet
SELECT u.id AS user_id, u.waitlist_xp, g.status AS grant_status
FROM users u LEFT JOIN waitlist_grants g ON g.user_id = u.id
WHERE u.waitlist_user_id IS NOT NULL AND COALESCE(u.waitlist_xp, 0) > 0
  AND (g.id IS NULL OR g.status <> 'granted');

-- C (main DB): the archive after the frozen import
SELECT s.frozen, s.row_count, count(*) AS rows, sum((a.record->>'reputationPoints')::int) AS xp,
       md5(string_agg(a.id || ':' || (a.record->>'reputationPoints'), ',' ORDER BY a.id COLLATE "C")) AS fingerprint
FROM waitlist_referral_archive a CROSS JOIN waitlist_archive_state s
WHERE a.active AND s.id = 'waitlist'
GROUP BY s.frozen, s.row_count;

-- D (waitlist DB): the same numbers at the source
SELECT count(*) AS rows, sum(reputation_points) AS xp,
       md5(string_agg(id || ':' || reputation_points, ',' ORDER BY id COLLATE "C")) AS fingerprint
FROM waitlist_users;
```
