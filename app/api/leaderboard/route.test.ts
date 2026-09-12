import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OWNER_ID,
  STRANGER_ID,
  TEST_SESSION_SECRET,
  expiredSession,
  forgedSession,
  requestAs,
  requestWithSession,
} from '@/lib/__tests__/session-fixtures';

const db = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: db.queryRaw } }));

import { POST } from './route';

const URL = 'http://localhost/api/leaderboard';

interface Row {
  id: string;
  display_name: string;
  oauth_provider: string;
  email: string | null;
  twitter_handle: string | null;
  oauth_avatar_url: string | null;
  custom_avatar_url: string | null;
  referral_count: number;
  registration_order: number;
  rank: number;
}

function row(id: string, displayName: string, referralCount: number, rank: number): Row {
  return {
    id,
    display_name: displayName,
    oauth_provider: 'twitch',
    email: null,
    twitter_handle: null,
    oauth_avatar_url: null,
    custom_avatar_url: null,
    referral_count: referralCount,
    registration_order: rank,
    rank,
  };
}

const LEADER = row('leader-row-0', 'Top Player', 50, 1);
const OWNER = row(OWNER_ID, 'Player One', 2, 40);
const STRANGER = row(STRANGER_ID, 'Someone Else', 9, 7);

const BY_ID: Record<string, Row> = { [OWNER_ID]: OWNER, [STRANGER_ID]: STRANGER };

/**
 * Two queries run here and the fake tells them apart by what the route passed:
 * the top list is parameterised by a numeric limit, the second query by the id of
 * the row to report as "me". That id is the whole subject of these tests, so the
 * fake answers with the row it actually names rather than a fixed result, and a
 * route that looks up the wrong row returns the wrong person's standing.
 */
beforeEach(() => {
  process.env.WAITLIST_SESSION_SECRET = TEST_SESSION_SECRET;
  db.queryRaw.mockReset().mockImplementation(async (_sql: TemplateStringsArray, value: unknown) => {
    if (typeof value === 'number') return [LEADER].slice(0, value);
    return BY_ID[String(value)] ? [BY_ID[String(value)]] : [];
  });
});

/** The id the route chose to report as the caller, taken from the second query. */
function lookedUpId(): unknown {
  const lookup = db.queryRaw.mock.calls.find(call => typeof call[1] === 'string');
  return lookup?.[1];
}

describe('reading the referral leaderboard', () => {
  it('refuses a caller with no session', async () => {
    const response = await POST(
      requestWithSession(URL, null, { body: { userId: STRANGER_ID, limit: 1 } })
    );

    expect(response.status).toBe(401);
    expect(db.queryRaw).not.toHaveBeenCalled();
  });

  it('refuses a session signed by a key this deployment does not hold', async () => {
    const response = await POST(
      requestWithSession(URL, await forgedSession(STRANGER_ID), {
        body: { userId: STRANGER_ID, limit: 1 },
      })
    );

    expect(response.status).toBe(401);
    expect(db.queryRaw).not.toHaveBeenCalled();
  });

  it('refuses a session that has expired', async () => {
    const response = await POST(
      requestWithSession(URL, await expiredSession(OWNER_ID), {
        body: { userId: STRANGER_ID, limit: 1 },
      })
    );

    expect(response.status).toBe(401);
    expect(db.queryRaw).not.toHaveBeenCalled();
  });

  it('refuses everyone while this deployment holds no signing secret', async () => {
    delete process.env.WAITLIST_SESSION_SECRET;

    const response = await POST(
      await requestAs(URL, OWNER_ID, { body: { userId: STRANGER_ID, limit: 1 } })
    );

    expect(response.status).toBe(503);
    expect(db.queryRaw).not.toHaveBeenCalled();
  });

  it('reports the standing of the signed-in row, not the one the body names', async () => {
    const response = await POST(
      await requestAs(URL, OWNER_ID, { body: { userId: STRANGER_ID, limit: 1 } })
    );

    expect(response.status).toBe(200);
    expect(lookedUpId()).toBe(OWNER_ID);
  });

  it('never reveals the standing of a row the caller merely names', async () => {
    const response = await POST(
      await requestAs(URL, OWNER_ID, { body: { userId: STRANGER_ID, limit: 1 } })
    );
    const payload = await response.json();

    expect(payload.data.currentUserEntry).toMatchObject({
      displayName: 'Player One',
      referralCount: 2,
      rank: 40,
    });
    expect(JSON.stringify(payload)).not.toContain('Someone Else');
  });

  it('marks the signed-in row inside the top list, not the one the body names', async () => {
    db.queryRaw.mockImplementationOnce(async () => [OWNER, STRANGER]);

    const response = await POST(
      await requestAs(URL, OWNER_ID, { body: { userId: STRANGER_ID, limit: 2 } })
    );
    const payload = await response.json();
    const flagged = payload.data.leaderboard.filter(
      (entry: { isCurrentUser?: boolean }) => entry.isCurrentUser
    );

    expect(flagged).toHaveLength(1);
    expect(flagged[0].displayName).toBe('Player One');
  });

  it('still returns the top list to a signed-in caller', async () => {
    const response = await POST(await requestAs(URL, OWNER_ID, { body: { limit: 1 } }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.leaderboard).toHaveLength(1);
    expect(payload.data.leaderboard[0]).toMatchObject({ rank: 1, displayName: 'Top Player' });
  });
});
