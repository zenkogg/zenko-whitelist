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
const connection = { twitterId: '99887766', twitterHandle: '@player_one' };

beforeEach(() => {
  process.env.WAITLIST_SESSION_SECRET = TEST_SESSION_SECRET;
  db.findUnique.mockReset().mockResolvedValue({ id: OWNER_ID });
  db.findFirst.mockReset().mockResolvedValue(null);
  db.update.mockReset().mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
});

describe('connecting an X account', () => {
  it('refuses a caller with no session', async () => {
    const response = await POST(requestWithSession(URL, null, { body: connection }));

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses to attach a handle to a row named only in the body', async () => {
    const response = await POST(
      requestWithSession(URL, null, { body: { ...connection, userId: STRANGER_ID } })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses a session signed by a key this deployment does not hold', async () => {
    const response = await POST(
      requestWithSession(URL, await forgedSession(STRANGER_ID), { body: connection })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('attaches to the signed-in row even when the body names another', async () => {
    const response = await POST(
      await requestAs(URL, OWNER_ID, { body: { ...connection, userId: STRANGER_ID } })
    );

    expect(response.status).toBe(200);
    expect(db.update.mock.calls[0][0].where.id).toBe(OWNER_ID);
  });

  it('stores the handle without its leading marker', async () => {
    const response = await POST(await requestAs(URL, OWNER_ID, { body: connection }));

    expect(response.status).toBe(200);
    expect(db.update.mock.calls[0][0].data.twitterHandle).toBe('player_one');
  });

  it('still refuses a handle already connected to someone else', async () => {
    db.findFirst.mockResolvedValueOnce({ id: STRANGER_ID });

    const response = await POST(await requestAs(URL, OWNER_ID, { body: connection }));

    expect(response.status).toBe(409);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('still refuses a request with no handle', async () => {
    const response = await POST(
      await requestAs(URL, OWNER_ID, { body: { twitterId: '99887766' } })
    );

    expect(response.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });
});
