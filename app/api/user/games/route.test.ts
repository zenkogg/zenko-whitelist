import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OWNER_ID,
  STRANGER_ID,
  TEST_SESSION_SECRET,
  forgedSession,
  requestAs,
  requestWithSession,
} from '@/lib/__tests__/session-fixtures';

const db = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }));

// `after` needs a request scope it has no way to get here, and the Loops sync it
// schedules is not what these cases are about.
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return { ...actual, after: () => undefined };
});
vi.mock('@/lib/prisma', () => ({
  prisma: { waitlistUser: { findUnique: db.findUnique, update: db.update } },
}));
vi.mock('@/lib/loops/sync', () => ({ syncWaitlistUser: vi.fn() }));

import { POST } from './route';

const URL = 'http://localhost/api/user/games';

beforeEach(() => {
  process.env.WAITLIST_SESSION_SECRET = TEST_SESSION_SECRET;
  db.findUnique.mockReset().mockResolvedValue({ id: OWNER_ID, registeredAt: null });
  db.update.mockReset().mockImplementation(async ({ data }) => ({
    id: OWNER_ID,
    displayName: 'Player One',
    referralCode: 'ABC123',
    ...data,
  }));
});

function updatedRowId() {
  return db.update.mock.calls[0][0].where.id;
}

describe('game selection', () => {
  it('refuses a caller with no session', async () => {
    const response = await POST(requestWithSession(URL, null, { body: { games: ['lol'] } }));

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses a caller who names a row in the body and nothing else', async () => {
    const response = await POST(
      requestWithSession(URL, null, { body: { games: ['lol'], userId: STRANGER_ID } })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses a session signed by a key this deployment does not hold', async () => {
    const response = await POST(
      requestWithSession(URL, await forgedSession(STRANGER_ID), { body: { games: ['lol'] } })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('writes the signed-in row even when the body names another', async () => {
    const response = await POST(
      await requestAs(URL, OWNER_ID, { body: { games: ['lol'], userId: STRANGER_ID } })
    );

    expect(response.status).toBe(200);
    expect(updatedRowId()).toBe(OWNER_ID);
  });

  it('writes the games the signed-in caller chose', async () => {
    const response = await POST(await requestAs(URL, OWNER_ID, { body: { games: ['lol', 'tft'] } }));

    expect(response.status).toBe(200);
    expect(db.update.mock.calls[0][0].data.games).toEqual(['lol', 'tft']);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { id: OWNER_ID, games: ['lol', 'tft'] },
    });
  });

  it('still refuses a game it does not support', async () => {
    const response = await POST(await requestAs(URL, OWNER_ID, { body: { games: ['chess'] } }));

    expect(response.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('still refuses an empty selection', async () => {
    const response = await POST(await requestAs(URL, OWNER_ID, { body: { games: [] } }));

    expect(response.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('reports a session whose row is gone rather than writing', async () => {
    db.findUnique.mockResolvedValueOnce(null);

    const response = await POST(await requestAs(URL, OWNER_ID, { body: { games: ['lol'] } }));

    expect(response.status).toBe(404);
    expect(db.update).not.toHaveBeenCalled();
  });
});
