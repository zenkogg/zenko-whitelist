import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OWNER_ID,
  STRANGER_ID,
  TEST_SESSION_SECRET,
  forgedSession,
  requestAs,
  requestWithSession,
} from '@/lib/__tests__/session-fixtures';

const db = vi.hoisted(() => ({ update: vi.fn() }));
const username = vi.hoisted(() => ({ available: vi.fn(), validate: vi.fn() }));

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return { ...actual, after: () => undefined };
});
vi.mock('@/lib/prisma', () => ({ prisma: { waitlistUser: { update: db.update } } }));
vi.mock('@/lib/username', () => ({
  isUsernameAvailable: username.available,
  validateUsernameInput: username.validate,
}));
vi.mock('@/lib/loops/sync', () => ({ syncWaitlistUser: vi.fn() }));

import { GET, PATCH } from './route';

const URL = 'http://localhost/api/user/username';

beforeEach(() => {
  process.env.WAITLIST_SESSION_SECRET = TEST_SESSION_SECRET;
  username.validate.mockReset().mockImplementation((value: string) => ({ ok: true, value }));
  username.available.mockReset().mockResolvedValue(true);
  db.update.mockReset().mockImplementation(async ({ where, data }) => ({
    id: where.id,
    username: data.username,
  }));
});

describe('username availability check', () => {
  it('refuses a caller with no session', async () => {
    const response = await GET(
      requestWithSession(URL, null, { method: 'GET', search: { username: 'newname' } })
    );

    expect(response.status).toBe(401);
    expect(username.available).not.toHaveBeenCalled();
  });

  it('refuses to answer for a row named only in the query', async () => {
    const response = await GET(
      requestWithSession(URL, null, {
        method: 'GET',
        search: { username: 'newname', userId: STRANGER_ID },
      })
    );

    expect(response.status).toBe(401);
    expect(username.available).not.toHaveBeenCalled();
  });

  it('excludes the signed-in row, not one named in the query', async () => {
    const response = await GET(
      await requestAs(URL, OWNER_ID, {
        method: 'GET',
        search: { username: 'newname', userId: STRANGER_ID },
      })
    );

    expect(response.status).toBe(200);
    expect(username.available).toHaveBeenCalledWith('newname', OWNER_ID);
  });

  it('reports an available name to the signed-in caller', async () => {
    const response = await GET(
      await requestAs(URL, OWNER_ID, { method: 'GET', search: { username: 'newname' } })
    );

    await expect(response.json()).resolves.toEqual({ available: true, value: 'newname' });
  });

  it('reports a taken name to the signed-in caller', async () => {
    username.available.mockResolvedValueOnce(false);

    const response = await GET(
      await requestAs(URL, OWNER_ID, { method: 'GET', search: { username: 'taken' } })
    );

    await expect(response.json()).resolves.toEqual({ available: false, error: 'Already taken' });
  });
});

describe('username change', () => {
  it('refuses a caller with no session', async () => {
    const response = await PATCH(
      requestWithSession(URL, null, { method: 'PATCH', body: { username: 'newname' } })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses to rename a row named only in the body', async () => {
    const response = await PATCH(
      requestWithSession(URL, null, {
        method: 'PATCH',
        body: { username: 'newname', userId: STRANGER_ID },
      })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses a session signed by a key this deployment does not hold', async () => {
    const response = await PATCH(
      requestWithSession(URL, await forgedSession(STRANGER_ID), {
        method: 'PATCH',
        body: { username: 'newname' },
      })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('renames the signed-in row even when the body names another', async () => {
    const response = await PATCH(
      await requestAs(URL, OWNER_ID, {
        method: 'PATCH',
        body: { username: 'newname', userId: STRANGER_ID },
      })
    );

    expect(response.status).toBe(200);
    expect(db.update.mock.calls[0][0].where.id).toBe(OWNER_ID);
  });

  it('persists the validated name for the signed-in caller', async () => {
    const response = await PATCH(
      await requestAs(URL, OWNER_ID, { method: 'PATCH', body: { username: 'newname' } })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { user: { id: OWNER_ID, username: 'newname' } },
    });
  });

  it('still refuses a name that fails validation', async () => {
    username.validate.mockReturnValueOnce({ ok: false, error: 'Too short' });

    const response = await PATCH(
      await requestAs(URL, OWNER_ID, { method: 'PATCH', body: { username: 'x' } })
    );

    expect(response.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });
});
