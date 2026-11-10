import { describe, expect, it } from 'vitest';
import {
  planContactExport,
  toCsv,
  type ExportLegacyEntry,
  type ExportUser,
} from '@/lib/contact-export';

function user(overrides: Partial<ExportUser> = {}): ExportUser {
  return {
    id: 'user-1',
    email: 'Player@Example.com',
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

function legacyEntry(overrides: Partial<ExportLegacyEntry> = {}): ExportLegacyEntry {
  return {
    id: 'legacy-1',
    email: 'old@example.com',
    games: ['tft'],
    status: 'PENDING',
    createdAt: new Date('2026-01-05T08:00:00.000Z'),
    ...overrides,
  };
}

describe('contact export plan', () => {
  it('sends a row with an email to Loops under the same mapping the live sync uses', () => {
    const plan = planContactExport([user()], [], null);

    expect(plan.loops).toEqual([
      expect.objectContaining({
        email: 'player@example.com',
        waitlistUserId: 'user-1',
        waitlistStatus: 'PENDING',
        waitlistXp: 20,
      }),
    ]);
    expect(plan.csv).toEqual([]);
  });

  it('never puts a subscription or list change on a contact', () => {
    const plan = planContactExport([user()], [legacyEntry()], 'keep');

    for (const contact of plan.loops) {
      expect(contact).not.toHaveProperty('subscribed');
      expect(contact).not.toHaveProperty('mailingLists');
    }
  });

  it('keeps a row Loops cannot hold, one with no email, in the vault CSV', () => {
    const xUser = user({
      id: 'x-user',
      email: null,
      oauthProvider: 'twitter',
      twitterHandle: 'x_handle',
    });

    const plan = planContactExport([xUser], [], null);

    expect(plan.loops).toEqual([]);
    expect(plan.csv).toEqual([
      expect.objectContaining({ id: 'x-user', reason: 'no_email', twitterHandle: 'x_handle' }),
    ]);
    expect(plan.counts).toMatchObject({ noEmailUsers: 1, xHandles: 1, csvRows: 1 });
  });

  it('sends the newest of two rows sharing an email to Loops and the other to the CSV', () => {
    const older = user({
      id: 'twitch-row',
      email: 'SAME@example.com',
      oauthProvider: 'twitch',
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    });
    const newer = user({
      id: 'google-row',
      email: 'same@example.com',
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    });

    const plan = planContactExport([older, newer], [], null);

    expect(plan.loops).toEqual([expect.objectContaining({ waitlistUserId: 'google-row' })]);
    expect(plan.csv).toEqual([
      expect.objectContaining({ id: 'twitch-row', reason: 'duplicate_email' }),
    ]);
    expect(plan.counts).toMatchObject({ usersWithEmail: 2, distinctEmails: 1, duplicateEmailUsers: 1 });
  });

  it('counts a legacy email already on a waitlist row as covered, whatever the decision', () => {
    for (const decision of ['keep', 'drop', null] as const) {
      const plan = planContactExport(
        [user({ email: 'old@example.com' })],
        [legacyEntry({ email: 'OLD@example.com' })],
        decision
      );

      expect(plan.loops).toHaveLength(1);
      expect(plan.csv).toEqual([]);
      expect(plan.counts).toMatchObject({ legacyAlreadyCovered: 1, legacyUnique: 0 });
    }
  });

  it('exports a unique legacy email to Loops and the CSV when the rows are kept', () => {
    const plan = planContactExport([user()], [legacyEntry()], 'keep');

    expect(plan.loops).toContainEqual({
      email: 'old@example.com',
      waitlistGames: 'tft',
      waitlistJoinedAt: '2026-01-05T08:00:00.000Z',
    });
    expect(plan.csv).toEqual([
      expect.objectContaining({ id: 'legacy-1', source: 'whitelist_entries', reason: 'legacy' }),
    ]);
    expect(plan.counts).toMatchObject({ legacyUnique: 1, loopsContacts: 2, csvRows: 1 });
  });

  it('exports no unique legacy email when the rows are dropped or the decision is missing', () => {
    for (const decision of ['drop', null] as const) {
      const plan = planContactExport([user()], [legacyEntry()], decision);

      expect(plan.loops).toHaveLength(1);
      expect(plan.csv).toEqual([]);
      expect(plan.counts).toMatchObject({ legacyRows: 1, legacyUnique: 1 });
    }
  });

  it('accounts for every waitlist row exactly once across Loops and the CSV', () => {
    const users = [
      user({ id: 'a', email: 'a@example.com' }),
      user({ id: 'b', email: 'shared@example.com', updatedAt: new Date('2026-06-01') }),
      user({ id: 'c', email: 'Shared@example.com', updatedAt: new Date('2026-07-01') }),
      user({ id: 'd', email: null, oauthProvider: 'twitter' }),
      user({ id: 'e', email: '   ' }),
    ];

    const plan = planContactExport(users, [], null);
    const inLoops = plan.loops.map((c) => ('waitlistUserId' in c ? c.waitlistUserId : null));
    const inCsv = plan.csv.map((r) => r.id);

    expect([...inLoops, ...inCsv].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(plan.counts).toMatchObject({ users: 5, distinctEmails: 2, noEmailUsers: 2 });
  });
});

describe('vault CSV', () => {
  it('quotes every field so commas, quotes and line breaks survive', () => {
    const plan = planContactExport(
      [user({ email: null, displayName: 'Say "hi", then\nleave', games: ['lol', 'tft'] })],
      [],
      null
    );

    const [header, row] = toCsv(plan.csv).split('\r\n');

    expect(header).toBe(
      'source,reason,id,provider,email,displayName,username,twitterHandle,games,status,createdAt'
    );
    expect(row).toContain('"Say ""hi"", then\nleave"');
    expect(row).toContain('"lol;tft"');
  });
});
