import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OWNER_ID,
  STRANGER_ID,
  TEST_SESSION_SECRET,
  forgedSession,
  requestAs,
  requestWithSession,
} from '@/lib/__tests__/session-fixtures';

const db = vi.hoisted(() => ({ findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() }));

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return { ...actual, after: () => undefined };
});
vi.mock('@/lib/prisma', () => ({
  prisma: {
    waitlistUser: { findUnique: db.findUnique, findFirst: db.findFirst, update: db.update },
  },
}));
vi.mock('@/lib/loops/sync', () => ({ syncWaitlistUser: vi.fn() }));

import { POST } from './route';

const URL = 'http://localhost/api/user/twitter';

/** What a caller can type. None of it is proof of anything. */
const claimed = { twitterId: '99887766', twitterHandle: '@imposter' };

/** What the X exchange wrote when this row signed in through X. */
function provenRow(overrides: Record<string, unknown> = {}) {
  return {
    id: OWNER_ID,
    oauthProvider: 'twitter',
    oauthId: 'x-user-4477',
    twitterId: 'x-user-4477',
    twitterHandle: 'proven_handle',
    twitterConnectedAt: new Date('2026-03-04T09:00:00Z'),
    ...overrides,
  };
}

/** A row that signed in some other way, so no X exchange ever ran against it. */
function unprovenRow(overrides: Record<string, unknown> = {}) {
  return {
    id: OWNER_ID,
    oauthProvider: 'google',
    oauthId: 'google-sub-1',
    twitterId: null,
    twitterHandle: null,
    twitterConnectedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  process.env.WAITLIST_SESSION_SECRET = TEST_SESSION_SECRET;
  db.findUnique.mockReset().mockResolvedValue(provenRow());
  db.findFirst.mockReset().mockResolvedValue(null);
  db.update.mockReset().mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
});

describe('connecting an X account', () => {
  it('refuses a caller with no session', async () => {
    const response = await POST(requestWithSession(URL, null, { body: claimed }));

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses to attach a handle to a row named only in the body', async () => {
    const response = await POST(
      requestWithSession(URL, null, { body: { ...claimed, userId: STRANGER_ID } })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses a session signed by a key this deployment does not hold', async () => {
    const response = await POST(
      requestWithSession(URL, await forgedSession(STRANGER_ID), { body: claimed })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses a row that has never completed an X exchange', async () => {
    db.findUnique.mockResolvedValue(unprovenRow());

    const response = await POST(await requestAs(URL, OWNER_ID, { body: claimed }));

    expect(response.status).toBe(403);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses a row whose X exchange recorded no handle', async () => {
    db.findUnique.mockResolvedValue(provenRow({ twitterHandle: null }));

    const response = await POST(await requestAs(URL, OWNER_ID, { body: claimed }));

    expect(response.status).toBe(403);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('binds the identity the exchange verified, never the one the body claims', async () => {
    const response = await POST(await requestAs(URL, OWNER_ID, { body: claimed }));

    expect(response.status).toBe(200);
    expect(db.update.mock.calls[0][0].data).toMatchObject({
      twitterId: 'x-user-4477',
      twitterHandle: 'proven_handle',
    });
  });

  it('checks the verified id for a conflict, not the claimed one', async () => {
    await POST(await requestAs(URL, OWNER_ID, { body: claimed }));

    expect(db.findFirst.mock.calls[0][0].where.twitterId).toBe('x-user-4477');
  });

  it('acts on the signed-in row even when the body names another', async () => {
    const response = await POST(
      await requestAs(URL, OWNER_ID, { body: { ...claimed, userId: STRANGER_ID } })
    );

    expect(response.status).toBe(200);
    expect(db.update.mock.calls[0][0].where.id).toBe(OWNER_ID);
  });

  it('leaves the sign-in identity the row was created with alone', async () => {
    await POST(await requestAs(URL, OWNER_ID, { body: claimed }));

    expect(db.update.mock.calls[0][0].data).not.toHaveProperty('oauthId');
    expect(db.update.mock.calls[0][0].data).not.toHaveProperty('oauthProvider');
  });

  it('keeps the timestamp of the connection it already had', async () => {
    await POST(await requestAs(URL, OWNER_ID, { body: claimed }));

    expect(db.update.mock.calls[0][0].data.twitterConnectedAt).toEqual(
      new Date('2026-03-04T09:00:00Z')
    );
  });

  it('still refuses when another row already holds that X account', async () => {
    db.findFirst.mockResolvedValueOnce({ id: STRANGER_ID });

    const response = await POST(await requestAs(URL, OWNER_ID, { body: claimed }));

    expect(response.status).toBe(409);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('still refuses a session whose row no longer exists', async () => {
    db.findUnique.mockResolvedValue(null);

    const response = await POST(await requestAs(URL, OWNER_ID, { body: claimed }));

    expect(response.status).toBe(404);
    expect(db.update).not.toHaveBeenCalled();
  });
});
