/**
 * Runs the waitlist contact export: checks the flags, reads the frozen waitlist
 * once, then prints the counts, writes the vault CSV, or upserts Loops contacts.
 * The script wires in the real database and Loops client; tests inject fakes, so
 * every refusal here is proved without either.
 */

import { createHash } from 'node:crypto';
import path from 'node:path';
import { isLoopsDryRun, type LoopsClient } from './loops/client';
import {
  planContactExport,
  toCsv,
  type ExportLegacyEntry,
  type ExportUser,
  type LegacyDecision,
} from './contact-export';

/** Loops allows 10 requests a second per team; stay under it. */
export const UPSERT_SPACING_MS = 120;

export interface ContactExportOptions {
  legacy?: string;
  csv?: string;
  apply?: boolean;
  environment?: string;
}

export interface WaitlistRows {
  users: ExportUser[];
  entries: ExportLegacyEntry[];
}

/** The waitlist database, opened once per run and closed whatever happens. */
export interface WaitlistSource {
  read(): Promise<WaitlistRows>;
  close(): Promise<void>;
}

export interface ContactExportDeps {
  /** The live environment, which opening the source may add the checkout's .env to. */
  env: Record<string, string | undefined>;
  openSource(): WaitlistSource;
  loops: Pick<LoopsClient, 'updateContact'>;
  writeCsv(file: string, text: string): Promise<void>;
  sleep(ms: number): Promise<void>;
}

export interface ContactExportResult {
  report: Record<string, unknown>;
  /** False when any Loops upsert failed; the report then lists each one. */
  ok: boolean;
}

function legacyDecision(value: string | undefined): LegacyDecision | null {
  if (value === undefined) return null;
  if (value === 'keep' || value === 'drop') return value;
  throw new Error('--legacy must be keep or drop');
}

export async function runContactExport(
  options: ContactExportOptions,
  deps: ContactExportDeps
): Promise<ContactExportResult> {
  const legacy = legacyDecision(options.legacy);
  if ((options.csv || options.apply) && !legacy) {
    throw new Error('Writing an export needs the recorded decision: --legacy keep or --legacy drop');
  }
  if (options.csv && !path.isAbsolute(options.csv)) {
    throw new Error('--csv needs an absolute path to a private location');
  }
  const environment = options.environment;
  if (options.apply && environment !== 'production' && environment !== 'staging') {
    throw new Error('--apply needs --environment production or --environment staging');
  }
  // Judged before the database client loads the checkout's .env, so the key is
  // the one this run was handed and never a file's key for another workspace.
  if (options.apply && !(deps.env.LOOPS_API_KEY ?? '').trim()) {
    throw new Error('--apply needs LOOPS_API_KEY for the target workspace');
  }

  const source = deps.openSource();
  try {
    // Judged after it, because a dry run set only in that .env would log every
    // contact and still report each one as sent.
    if (options.apply && isLoopsDryRun(deps.env)) {
      throw new Error(
        '--apply refuses to run while LOOPS_DRY_RUN=1 is set, in the shell or the checkout .env: ' +
          'a dry run only logs each contact and reports it as sent. Unset it and run again.'
      );
    }
    const rows = await source.read();
    const plan = planContactExport(rows.users, rows.entries, legacy);
    const report: Record<string, unknown> = { ...plan.counts };
    let ok = true;

    if (options.csv) {
      const text = toCsv(plan.csv);
      await deps.writeCsv(options.csv, text);
      report.csvSha256 = createHash('sha256').update(text).digest('hex');
    }

    if (options.apply) {
      const failed: Array<{ contact: string; error: string }> = [];
      for (const contact of plan.loops) {
        const result = await deps.loops.updateContact({ ...contact, environment });
        if (!result.ok) {
          const label = 'waitlistUserId' in contact ? contact.waitlistUserId : 'legacy entry';
          failed.push({ contact: label, error: result.error ?? `HTTP ${result.status}` });
        }
        await deps.sleep(UPSERT_SPACING_MS);
      }
      report.upserted = plan.loops.length - failed.length;
      report.failed = failed;
      ok = failed.length === 0;
    }

    return { report, ok };
  } finally {
    await source.close();
  }
}
