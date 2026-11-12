import { describe, expect, it, vi } from 'vitest';
import type { ExportUser } from '@/lib/contact-export';
import {
  runContactExport,
  type ContactExportDeps,
  type ContactExportOptions,
} from '@/lib/contact-export-run';

// The export run against a fake database and Loops client. The fake database
// copies its env file into the run's environment as it opens, without
// overriding, which is what Prisma's constructor does with the checkout's .env:
// a setting that lives only in that file is invisible until the client exists.

function user(overrides: Partial<ExportUser> = {}): ExportUser {
  return {
    id: 'user-1',
    email: 'player@example.com',
    status: 'PENDING',
    oauthProvider: 'google',
    displayName: 'Player One',
    referralCode: 'ABC234',
    username: 'player-one',
    twitterHandle: null,
    games: ['lol'],
    referralCount: 2,
    reputationPoints: 20,
    createdAt: new Date('2026-03-01T10:00:00.000Z'),
    invitedAt: null,
    updatedAt: new Date('2026-03-02T10:00:00.000Z'),
    ...overrides,
  };
}

function harness(setup: { shell?: Record<string, string>; dotenv?: Record<string, string> } = {}) {
  const env: Record<string, string | undefined> = { ...setup.shell };
  const read = vi.fn(async () => ({ users: [user()], entries: [] }));
  const close = vi.fn(async () => {});
  const updateContact = vi.fn(async () => ({ ok: true, status: 200 }));
  const writeCsv = vi.fn(async () => {});
  const deps: ContactExportDeps = {
    env,
    openSource: () => {
      for (const [key, value] of Object.entries(setup.dotenv ?? {})) {
        if (env[key] === undefined) env[key] = value;
      }
      return { read, close };
    },
    loops: { updateContact },
    writeCsv,
    sleep: async () => {},
  };
  return { deps, read, close, updateContact, writeCsv };
}

const APPLY: ContactExportOptions = { legacy: 'drop', apply: true, environment: 'production' };

describe('contact export apply run', () => {
  it('upserts every contact tagged with the environment it names', async () => {
    const run = harness({ shell: { LOOPS_API_KEY: 'test-key' } });

    const { report, ok } = await runContactExport(APPLY, run.deps);

    expect(ok).toBe(true);
    expect(run.updateContact).toHaveBeenCalledTimes(1);
    expect(run.updateContact).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'player@example.com', environment: 'production' })
    );
    expect(report).toMatchObject({ upserted: 1, failed: [] });
  });

  it('refuses while the checkout .env alone sets LOOPS_DRY_RUN, before reading a row', async () => {
    const run = harness({ shell: { LOOPS_API_KEY: 'test-key' }, dotenv: { LOOPS_DRY_RUN: '1' } });

    await expect(runContactExport(APPLY, run.deps)).rejects.toThrow(/LOOPS_DRY_RUN/);
    expect(run.read).not.toHaveBeenCalled();
    expect(run.updateContact).not.toHaveBeenCalled();
    expect(run.close).toHaveBeenCalledTimes(1);
  });

  it('refuses while the shell sets LOOPS_DRY_RUN', async () => {
    const run = harness({ shell: { LOOPS_API_KEY: 'test-key', LOOPS_DRY_RUN: '1' } });

    await expect(runContactExport(APPLY, run.deps)).rejects.toThrow(/LOOPS_DRY_RUN/);
    expect(run.updateContact).not.toHaveBeenCalled();
  });

  it('still needs the key from the shell, not from the checkout .env', async () => {
    const run = harness({ dotenv: { LOOPS_API_KEY: 'key-from-a-file' } });

    await expect(runContactExport(APPLY, run.deps)).rejects.toThrow(/LOOPS_API_KEY/);
    expect(run.read).not.toHaveBeenCalled();
    expect(run.updateContact).not.toHaveBeenCalled();
  });
});

describe('contact export counts run', () => {
  it('still runs while LOOPS_DRY_RUN is set, and never calls Loops', async () => {
    const run = harness({ dotenv: { LOOPS_DRY_RUN: '1' } });

    const { report, ok } = await runContactExport({}, run.deps);

    expect(ok).toBe(true);
    expect(report).toMatchObject({ users: 1, loopsContacts: 1, csvRows: 0 });
    expect(run.updateContact).not.toHaveBeenCalled();
    expect(run.writeCsv).not.toHaveBeenCalled();
  });
});
