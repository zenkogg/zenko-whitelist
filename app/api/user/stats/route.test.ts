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

const db = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    waitlistUser: { findUnique: db.findUnique, findMany: db.findMany, count: db.count },
    $queryRaw: db.queryRaw,
  },
}));

import { POST } from './route';

const URL = 'http://localhost/api/user/stats';

function ownerRow() {
  return {
    id: OWNER_ID,
    referralCount: 3,
    reputationPoints: 30,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    status: 'PENDING',
    displayName: 'Player One',
    referralCode: 'ABC123',
    username: 'player-one',
    usedReferralCode: null,
    games: ['lol'],
    oauthAvatarUrl: null,
    customAvatarUrl: null,
    twitterHandle: null,
    oauthProvider: 'google',
    email: 'player@example.com',
  };
}

function readRowId() {
  return db.findUnique.mock.calls[0][0].where.id;
}

beforeEach(() => {
  process.env.WAITLIST_SESSION_SECRET = TEST_SESSION_SECRET;
  db.findUnique.mockReset().mockResolvedValue(ownerRow());
  db.findMany.mockReset().mockResolvedValue([]);
  db.count.mockReset().mockResolvedValue(100);
  db.queryRaw.mockReset().mockResolvedValue([{ rank: 7, registration_order: 42 }]);
});

describe('profile stats', () => {
  it('refuses a caller with no session', async () => {
    const response = await POST(requestWithSession(URL, null, { body: {} }));

    expect(response.status).toBe(401);
    expect(db.findUnique).not.toHaveBeenCalled();
  });

  it('refuses to read a row named only in the body', async () => {
    const response = await POST(requestWithSession(URL, null, { body: { userId: STRANGER_ID } }));

    expect(response.status).toBe(401);
    expect(db.findUnique).not.toHaveBeenCalled();
  });

  it('refuses a session signed by a key this deployment does not hold', async () => {
    const response = await POST(
      requestWithSession(URL, await forgedSession(STRANGER_ID), { body: {} })
    );

    expect(response.status).toBe(401);
    expect(db.findUnique).not.toHaveBeenCalled();
  });

  it('refuses a session that has expired', async () => {
    const response = await POST(
      requestWithSession(URL, await expiredSession(OWNER_ID), { body: {} })
    );

    expect(response.status).toBe(401);
    expect(db.findUnique).not.toHaveBeenCalled();
  });

  it('reads the signed-in row even when the body names another', async () => {
    const response = await POST(await requestAs(URL, OWNER_ID, { body: { userId: STRANGER_ID } }));

    expect(response.status).toBe(200);
    expect(readRowId()).toBe(OWNER_ID);
  });

  it('returns the signed-in row profile and standing', async () => {
    const response = await POST(await requestAs(URL, OWNER_ID, { body: {} }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        user: { id: OWNER_ID, referralCode: 'ABC123', username: 'player-one' },
        stats: { referralCount: 3, reputationPoints: 30, estimatedRank: 7, totalPending: 100 },
      },
    });
  });

  it('reports a session whose row is gone', async () => {
    db.findUnique.mockResolvedValueOnce(null);

    const response = await POST(await requestAs(URL, OWNER_ID, { body: {} }));

    expect(response.status).toBe(404);
  });
});
