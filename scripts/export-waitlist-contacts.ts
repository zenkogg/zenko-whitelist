/**
 * Contact export for the waitlist sunset (zenkogg/zenko#694). Run it after the
 * waitlist is frozen, so the counts match the final referral snapshot.
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

import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { loops } from '../lib/loops/client';
import { planContactExport, toCsv, type LegacyDecision } from '../lib/contact-export';

/* Loops allows 10 requests a second per team; stay under it. */
const UPSERT_SPACING_MS = 120;

const { values } = parseArgs({
  options: {
    legacy: { type: 'string' },
    csv: { type: 'string' },
    apply: { type: 'boolean', default: false },
    environment: { type: 'string' },
  },
});

function legacyDecision(): LegacyDecision | null {
  if (values.legacy === undefined) return null;
  if (values.legacy === 'keep' || values.legacy === 'drop') return values.legacy;
  throw new Error('--legacy must be keep or drop');
}

async function main() {
  const legacy = legacyDecision();
  if ((values.csv || values.apply) && !legacy) {
    throw new Error('Writing an export needs the recorded decision: --legacy keep or --legacy drop');
  }
  if (values.csv && !path.isAbsolute(values.csv)) {
    throw new Error('--csv needs an absolute path to a private location');
  }
  const environment = values.environment;
  if (values.apply && environment !== 'production' && environment !== 'staging') {
    throw new Error('--apply needs --environment production or --environment staging');
  }
  if (values.apply && !(process.env.LOOPS_API_KEY ?? '').trim()) {
    throw new Error('--apply needs LOOPS_API_KEY for the target workspace');
  }

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$transaction(
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
    );

    const plan = planContactExport(rows.users, rows.entries, legacy);
    const report: Record<string, unknown> = { ...plan.counts };

    if (values.csv) {
      const text = toCsv(plan.csv);
      await writeFile(values.csv, text, { mode: 0o600, flag: 'wx' });
      report.csvSha256 = createHash('sha256').update(text).digest('hex');
    }

    if (values.apply) {
      const failed: Array<{ contact: string; error: string }> = [];
      for (const contact of plan.loops) {
        const result = await loops.updateContact({ ...contact, environment });
        if (!result.ok) {
          const label = 'waitlistUserId' in contact ? contact.waitlistUserId : 'legacy entry';
          failed.push({ contact: label, error: result.error ?? `HTTP ${result.status}` });
        }
        await new Promise((resolve) => setTimeout(resolve, UPSERT_SPACING_MS));
      }
      report.upserted = plan.loops.length - failed.length;
      report.failed = failed;
      if (failed.length > 0) process.exitCode = 1;
    }

    console.info(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Contact export failed');
  process.exitCode = 1;
});
