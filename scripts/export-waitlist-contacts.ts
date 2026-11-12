/**
 * Contact export for the waitlist sunset. Run it after the waitlist is frozen,
 * so the counts match the final referral snapshot.
 *
 *   Dry run (counts only):  npx tsx scripts/export-waitlist-contacts.ts
 *   Vault CSV:              ... --legacy keep|drop --csv /absolute/private/contacts.csv
 *   Loops upsert:           ... --legacy keep|drop --apply --environment production
 *
 * It reads the waitlist database in one read-only transaction and never writes
 * to it: stamping loops_synced_at would move updated_at past the snapshot.
 * Loops gets contact properties only, never an event or a list change, so no
 * workflow fires and nobody is resubscribed. `--environment` is required with
 * `--apply` because the runtime tag comes from VERCEL_ENV, which a laptop run
 * does not have, and a production contact tagged staging drops out of sends.
 */

import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { loops } from '../lib/loops/client';
import { runContactExport, type WaitlistSource } from '../lib/contact-export-run';

// Constructing the client copies the checkout's .env into process.env, without
// overriding what the shell set; the run judges LOOPS_DRY_RUN only after this.
function openWaitlistDatabase(): WaitlistSource {
  const prisma = new PrismaClient();
  return {
    read: () =>
      prisma.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
          const users = await tx.waitlistUser.findMany({
            orderBy: { id: 'asc' },
            select: {
              id: true,
              email: true,
              status: true,
              oauthProvider: true,
              displayName: true,
              referralCode: true,
              username: true,
              twitterHandle: true,
              games: true,
              referralCount: true,
              reputationPoints: true,
              createdAt: true,
              invitedAt: true,
              updatedAt: true,
            },
          });
          const entries = await tx.whitelistEntry.findMany({
            orderBy: { id: 'asc' },
            select: { id: true, email: true, games: true, status: true, createdAt: true },
          });
          return { users, entries };
        },
        { isolationLevel: 'RepeatableRead', timeout: 300000 }
      ),
    close: () => prisma.$disconnect(),
  };
}

const { values } = parseArgs({
  options: {
    legacy: { type: 'string' },
    csv: { type: 'string' },
    apply: { type: 'boolean', default: false },
    environment: { type: 'string' },
  },
});

runContactExport(values, {
  env: process.env,
  openSource: openWaitlistDatabase,
  loops,
  writeCsv: (file, text) => writeFile(file, text, { mode: 0o600, flag: 'wx' }),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
})
  .then(({ report, ok }) => {
    console.info(JSON.stringify(report, null, 2));
    if (!ok) process.exitCode = 1;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Contact export failed');
    process.exitCode = 1;
  });
