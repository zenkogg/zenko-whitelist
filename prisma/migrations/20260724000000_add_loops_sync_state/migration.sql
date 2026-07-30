-- Loops (loops.so) sync state on waitlist_users.
--   loops_synced_at  : stamped on a successful inline push to Loops (telemetry).
--   loops_sync_error : last caught failure; NULL once healed. This column is the
--                      work-list for the SQL->CSV re-export/heal — there is no
--                      recurring reconcile job (inline push is the only real-time
--                      path; see lib/loops/sync.ts).
-- Both nullable with no default, so the ALTER is instant on a large table.
ALTER TABLE "waitlist_users" ADD COLUMN "loops_synced_at" TIMESTAMP(3);
ALTER TABLE "waitlist_users" ADD COLUMN "loops_sync_error" TEXT;

-- Supports the backfill/heal work-list scan (rows never pushed, oldest first).
CREATE INDEX "waitlist_users_loops_synced_at_idx" ON "waitlist_users"("loops_synced_at");
